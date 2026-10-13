'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { resolveMapLink } from '@/actions/map-link'
import { needsResolving, parseMapLink } from '@/lib/map-link'
import { Button, Field, Input, Textarea } from './ui'

/**
 * Disables itself while the action is in flight. Without it a slow write invites
 * a second click, and the second click creates a second row.
 */
export function SubmitButton({ children = 'Save' }: { children?: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Saving…' : children}
    </Button>
  )
}

export function DeleteButton({ label = 'Delete', confirm }: { label?: string; confirm: string }) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      variant="danger"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(confirm)) event.preventDefault()
      }}
    >
      {pending ? 'Deleting…' : label}
    </Button>
  )
}

/**
 * One input per locale, submitted as `name.en`, `name.my`. Leaving a locale
 * blank omits it rather than storing an empty string - the API then falls back
 * to another language instead of rendering a blank name.
 */
export function LocalizedField({
  name,
  label,
  locales,
  values,
  multiline = false,
  required = false,
}: {
  name: string
  label: string
  locales: string[]
  values?: Record<string, string> | null
  multiline?: boolean
  required?: boolean
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-sm font-bold">{label}</legend>
      {locales.map((locale, index) => (
        // A label, not a div: wrapping the input names it. Without this each
        // box is an unnamed "edit text" to a screen reader, and a form with
        // four of them - two languages times name and description - is
        // unusable by ear. The legend above names the group, this names the
        // box, and together they read as "Name, EN".
        <label key={locale} className="flex items-start gap-2">
          <span className="mt-2 w-8 shrink-0 text-xs uppercase text-[var(--color-muted)]">
            {locale}
          </span>
          {multiline ? (
            <Textarea name={`${name}.${locale}`} defaultValue={values?.[locale] ?? ''} />
          ) : (
            <Input
              name={`${name}.${locale}`}
              defaultValue={values?.[locale] ?? ''}
              // Only the first locale is enforced: requiring every translation
              // up front would block entry until someone fluent is available.
              required={required && index === 0}
            />
          )}
        </label>
      ))}
    </fieldset>
  )
}

/** Coordinates are entered together because the API rejects half a pair. */
/**
 * Where the place is, from a pasted link or typed by hand.
 *
 * Typing two numbers means reading them off a map, copying them in the right
 * order and not transposing a digit - and a transposed digit puts a cafe in
 * the Andaman Sea with nothing on the form looking wrong. Pasting the link you
 * already have is fewer steps and no chance to mistype.
 *
 * The two fields stay, and stay editable. The link fills them; it does not
 * replace them. You can see what it found, correct it, or ignore the link
 * entirely and type the numbers as before. Nothing about the saved record
 * changes - the link itself is not stored, because what the place needs is a
 * point, and a Google URL is a point plus a dependency on Google.
 */
export function CoordinateFields({ lat, lng }: { lat?: number | null; lng?: number | null }) {
  const [latitude, setLatitude] = useState(lat ?? '')
  const [longitude, setLongitude] = useState(lng ?? '')
  const [link, setLink] = useState('')
  const [status, setStatus] = useState<{ tone: 'ok' | 'bad'; message: string } | null>(null)
  const [looking, setLooking] = useState(false)

  async function useLink(value: string) {
    const text = value.trim()
    if (!text) return

    // The common case needs no request at all.
    const direct = parseMapLink(text)
    if (direct) {
      apply(direct)
      return
    }

    if (!needsResolving(text)) {
      setStatus({ tone: 'bad', message: 'No coordinates in that link' })
      return
    }

    // A shortened link carries only an id, so the server has to open it.
    setLooking(true)
    setStatus(null)
    try {
      const result = await resolveMapLink(text)
      if (result.coordinates) apply(result.coordinates)
      else setStatus({ tone: 'bad', message: result.error })
    } catch {
      setStatus({ tone: 'bad', message: 'Could not open that link' })
    } finally {
      setLooking(false)
    }
  }

  function apply(found: { lat: number; lng: number }) {
    setLatitude(found.lat)
    setLongitude(found.lng)
    setStatus({ tone: 'ok', message: `Found ${found.lat}, ${found.lng}` })
  }

  return (
    <div className="space-y-3">
      <Field
        label="Map link"
        hint="Paste a Google Maps link and the coordinates below fill in. Not saved - only the point is."
      >
        <div className="flex gap-2">
          <Input
            name="map_link"
            type="text"
            value={link}
            placeholder="https://maps.app.goo.gl/… or 16.7751, 96.1605"
            onChange={(event) => {
              setLink(event.target.value)
              setStatus(null)
            }}
            // Pasting is the whole point, so it reads it immediately rather
            // than waiting for a button nobody expected to have to press.
            onPaste={(event) => {
              const pasted = event.clipboardData.getData('text')
              if (pasted) void useLink(pasted)
            }}
            onKeyDown={(event) => {
              // Enter inside a form submits it; here it means "read this".
              if (event.key === 'Enter') {
                event.preventDefault()
                void useLink(link)
              }
            }}
          />
          <Button type="button" variant="ghost" disabled={looking} onClick={() => void useLink(link)}>
            {looking ? 'Opening…' : 'Use'}
          </Button>
        </div>
      </Field>

      {status && (
        <p
          role="status"
          className={
            status.tone === 'ok'
              ? 'text-sm font-semibold text-[var(--color-accent)]'
              : 'text-sm font-semibold text-[var(--color-danger)]'
          }
        >
          {status.message}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Latitude" hint="Both or neither">
          <Input
            name="lat"
            type="number"
            step="any"
            value={latitude}
            onChange={(event) => setLatitude(event.target.value)}
          />
        </Field>
        <Field label="Longitude" hint="Yangon is around 16.7751, 96.1605">
          <Input
            name="lng"
            type="number"
            step="any"
            value={longitude}
            onChange={(event) => setLongitude(event.target.value)}
          />
        </Field>
      </div>
    </div>
  )
}
