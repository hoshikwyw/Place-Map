'use client'

import { useEffect, useState } from 'react'
import { REVIEW_AUTHOR_MAX, REVIEW_COMMENT_MAX, REVIEW_RATING_MAX } from '@place-map/shared'
import { t, type Locale } from '@/lib/i18n'

/**
 * Leaving a review.
 *
 * Posted straight to the API from the browser, for the same reason the
 * suggestion form is: a server action would send every visitor's review from
 * the site's own server, so the whole country would share one rate-limit
 * bucket.
 *
 * Nothing written here appears on the page afterwards, and the form says so
 * *before* anybody writes rather than after they press send - learning at the
 * end that your words are going into a queue is how a form feels like a trick.
 */

const API_URL = process.env.PLACE_MAP_PUBLIC_API_URL ?? ''

/**
 * Which places this device has reviewed.
 *
 * A convenience, not a lock: there are no accounts, so this stops the same
 * person reviewing twice by accident, and stops nobody who means to. The real
 * defences are the rate limit and an editor reading every one.
 */
const REVIEWED_KEY = 'place-map:reviewed'

function alreadyReviewed(placeId: number): boolean {
  try {
    const raw = localStorage.getItem(REVIEWED_KEY)
    return Array.isArray(JSON.parse(raw ?? '[]')) && JSON.parse(raw ?? '[]').includes(placeId)
  } catch {
    // Private window, blocked storage: let them write. The worst case is a
    // second review, which an editor sees before anybody else does.
    return false
  }
}

function remember(placeId: number): void {
  try {
    const raw = localStorage.getItem(REVIEWED_KEY)
    const list = JSON.parse(raw ?? '[]') as unknown
    const next = Array.isArray(list) ? [...new Set([...list, placeId])] : [placeId]
    localStorage.setItem(REVIEWED_KEY, JSON.stringify(next))
  } catch {
    // Nothing to do, and nothing worth telling the reader about.
  }
}

export function ReviewForm({ placeId, locale }: { placeId: number; locale: Locale }) {
  const text = t(locale)
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [state, setState] = useState<'editing' | 'sending' | 'sent' | 'done-before'>('editing')
  const [error, setError] = useState<string | null>(null)

  // After mounting, because the server does not know what this device has done
  // and rendering the form then hiding it would flicker.
  useEffect(() => {
    if (alreadyReviewed(placeId)) setState('done-before')
  }, [placeId])

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)

    if (rating < 1) {
      setError(text.reviews.needRating)
      return
    }

    setError(null)
    setState('sending')

    try {
      const response = await fetch(`${API_URL}/v1/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          place_id: placeId,
          rating,
          comment: String(form.get('comment') ?? '').trim() || undefined,
          author: String(form.get('author') ?? '').trim() || undefined,
          lang: locale,
          website: String(form.get('website') ?? ''),
        }),
      })

      if (response.status === 429) {
        setError(text.reviews.tooMany)
        setState('editing')
        return
      }
      if (!response.ok) {
        setError(text.reviews.failed)
        setState('editing')
        return
      }

      remember(placeId)
      setState('sent')
    } catch {
      setError(text.reviews.failed)
      setState('editing')
    }
  }

  if (state === 'done-before') {
    return (
      <p className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-muted)]">
        {text.reviews.alreadyLeft}
      </p>
    )
  }

  if (state === 'sent') {
    return (
      <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5 text-center">
        <p className="text-lg font-bold">{text.reviews.thanks}</p>
        <p className="mt-1.5 text-sm text-[var(--color-muted)]">{text.reviews.thanksBody}</p>
      </div>
    )
  }

  const sending = state === 'sending'
  const shown = hovered || rating

  return (
    <form
      onSubmit={send}
      className="space-y-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5"
    >
      <div>
        <h3 className="text-base font-bold">{text.reviews.write}</h3>
        <p className="mt-0.5 text-xs text-[var(--color-muted)]">{text.reviews.held}</p>
      </div>

      {/* Radios rather than buttons: a rating is one choice out of five, which
          is what a radio group is, and it arrives keyboard-operable and
          readable by a screen reader without any help. */}
      <fieldset onMouseLeave={() => setHovered(0)}>
        <legend className="mb-1.5 text-sm font-bold">{text.reviews.yourRating}</legend>
        <div className="flex items-center gap-1">
          {Array.from({ length: REVIEW_RATING_MAX }, (_, index) => index + 1).map((star) => (
            <label
              key={star}
              onMouseEnter={() => setHovered(star)}
              className="cursor-pointer text-3xl leading-none transition"
              title={text.reviews.starsLabel(star)}
            >
              <input
                type="radio"
                name="rating"
                value={star}
                checked={rating === star}
                onChange={() => setRating(star)}
                className="sr-only"
              />
              <span
                aria-hidden
                className={star <= shown ? 'text-[var(--color-star)]' : 'text-[var(--color-line)]'}
              >
                ★
              </span>
              <span className="sr-only">{text.reviews.starsLabel(star)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="mb-1.5 flex items-baseline gap-2">
          <span className="text-sm font-bold">{text.reviews.comment}</span>
          <span className="text-xs text-[var(--color-muted)]">{text.reviews.optional}</span>
        </span>
        <textarea
          name="comment"
          rows={4}
          maxLength={REVIEW_COMMENT_MAX}
          placeholder={text.reviews.commentPlaceholder}
          className={`${inputClass} resize-y`}
        />
      </label>

      <label className="block">
        <span className="mb-1.5 flex items-baseline gap-2">
          <span className="text-sm font-bold">{text.reviews.name}</span>
          <span className="text-xs text-[var(--color-muted)]">{text.reviews.optional}</span>
        </span>
        <input
          name="author"
          type="text"
          maxLength={REVIEW_AUTHOR_MAX}
          placeholder={text.reviews.namePlaceholder}
          className={inputClass}
        />
      </label>

      {/* The honeypot, as on the suggestion form: off-screen, out of the tab
          order, hidden from screen readers. A filled one is answered as if it
          worked and dropped. */}
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
        {sending ? text.reviews.sending : text.reviews.send}
      </button>
    </form>
  )
}

const inputClass =
  'w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-canvas)] px-4 py-3 text-sm transition placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[var(--color-accent-soft)]'
