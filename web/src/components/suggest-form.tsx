'use client'

import { useState } from 'react'
import { SUGGESTION_NOTE_MAX } from '@place-map/shared'
import { t, type Locale } from '@/lib/i18n'

/**
 * The form a visitor fills in, posted straight to the API from the browser.
 *
 * Deliberately not a server action, which would be the shorter code. A server
 * action sends the request from the site's own server, so every visitor would
 * arrive at the API wearing the same address - and the API's rate limit, which
 * counts per address, would then be one bucket for the whole country. Posting
 * from the browser keeps one person's flood from silencing everybody else.
 *
 * The honeypot is the other reason this is hand-rolled: it needs a real input
 * in the markup that a person never sees and a form-filling script does.
 */

const API_URL = process.env.PLACE_MAP_PUBLIC_API_URL ?? ''

type State = 'editing' | 'sending' | 'sent'

export function SuggestForm({
  locale,
  place,
}: {
  locale: Locale
  /** Set when reporting a problem with a place that is already listed. */
  place?: { id: number; name: string }
}) {
  const text = t(locale)
  const [state, setState] = useState<State>('editing')
  const [error, setError] = useState<string | null>(null)

  // A correction is about a place that exists, so it needs no name; a new
  // place is nothing without one.
  const correction = place !== undefined

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const note = String(form.get('note') ?? '').trim()
    const name = String(form.get('name') ?? '').trim()

    // Checked here as well as by the API: a message under the server's own
    // floor would come back as a 400 the visitor cannot read.
    if (note.length < 5) {
      setError(text.suggest.tooShort)
      return
    }
    if (!correction && !name) {
      setError(text.suggest.needName)
      return
    }

    setError(null)
    setState('sending')

    try {
      const response = await fetch(`${API_URL}/v1/suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: correction ? 'correction' : 'new_place',
          place_id: place?.id,
          name: correction ? undefined : name,
          note,
          contact: String(form.get('contact') ?? '').trim() || undefined,
          lang: locale,
          // Empty unless something filled the whole form in.
          website: String(form.get('website') ?? ''),
        }),
      })

      if (response.status === 429) {
        setError(text.suggest.tooMany)
        setState('editing')
        return
      }
      if (!response.ok) {
        setError(text.suggest.failed)
        setState('editing')
        return
      }

      setState('sent')
    } catch {
      setError(text.suggest.failed)
      setState('editing')
    }
  }

  if (state === 'sent') {
    return (
      <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6 text-center">
        <p className="text-lg font-bold">{text.suggest.thanks}</p>
        <p className="mt-2 text-sm text-[var(--color-muted)]">{text.suggest.thanksBody}</p>
        <button
          type="button"
          onClick={() => setState('editing')}
          className="mt-4 rounded-full border border-[var(--color-line)] px-4 py-2 text-sm font-bold transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
        >
          {text.suggest.sendAnother}
        </button>
      </div>
    )
  }

  const sending = state === 'sending'

  return (
    <form
      onSubmit={send}
      className="space-y-5 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6"
    >
      {!correction && (
        <Field label={text.suggest.name}>
          <input
            name="name"
            required
            maxLength={120}
            placeholder={text.suggest.namePlaceholder}
            className={inputClass}
          />
        </Field>
      )}

      <Field label={text.suggest.note}>
        <textarea
          name="note"
          required
          rows={5}
          minLength={5}
          maxLength={SUGGESTION_NOTE_MAX}
          placeholder={
            correction ? text.suggest.noteReportPlaceholder : text.suggest.notePlaceholder
          }
          className={`${inputClass} resize-y`}
        />
      </Field>

      <Field label={text.suggest.contact} optional={text.suggest.optional} hint={text.suggest.contactHint}>
        <input name="contact" type="text" maxLength={120} className={inputClass} />
      </Field>

      {/*
        The honeypot. Hidden from sight and from screen readers, and taken out
        of the tab order, so nobody using this page can reach it; a script that
        fills every input will. The API answers a filled one as if it worked.

        Not `display: none`, which some fillers skip: this is off-screen and
        still technically visible.
      */}
      <div aria-hidden className="absolute left-[-9999px] top-auto h-0 w-0 overflow-hidden">
        <label>
          Website
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {error && (
        <p role="alert" className="text-sm font-semibold text-[var(--color-danger)]">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={sending}
        className="w-full rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-bold text-[var(--color-on-accent)] transition hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
      >
        {sending ? text.suggest.sending : text.suggest.send}
      </button>
    </form>
  )
}

const inputClass =
  'w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-canvas)] px-4 py-3 text-sm transition placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[var(--color-accent-soft)]'

function Field({
  label,
  hint,
  optional,
  children,
}: {
  label: string
  hint?: string
  optional?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline gap-2">
        <span className="text-sm font-bold">{label}</span>
        {optional && <span className="text-xs text-[var(--color-muted)]">{optional}</span>}
      </span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-[var(--color-muted)]">{hint}</span>}
    </label>
  )
}
