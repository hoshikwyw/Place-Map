'use client'

import { useState } from 'react'
import { LINK_TYPES, type PlaceLink, type LinkType } from '@place-map/shared'
import { Select } from './select'
import { Input } from './ui'

/**
 * A place's other links: Facebook, Instagram, TikTok, a Telegram channel.
 *
 * Separate from the Website field above it, which stays the canonical site -
 * the Telegram bot puts that one in a message button, and only one link can go
 * there.
 *
 * The whole list submits as one hidden JSON field. An input per row with
 * indexed names (`links.0.url`) would need the server to reassemble an array
 * from a flat FormData, and a removed middle row leaves a hole in the numbering
 * that is easy to get wrong.
 */

const LABELS: Record<LinkType, string> = {
  website: 'Website',
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  telegram: 'Telegram',
  viber: 'Viber',
  whatsapp: 'WhatsApp',
  x: 'X',
  other: 'Other',
}

const MAX_LINKS = 12

export function LinksField({ links }: { links?: PlaceLink[] | null }) {
  const [rows, setRows] = useState<PlaceLink[]>(() => links ?? [])

  const update = (index: number, change: Partial<PlaceLink>) =>
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...change } : row)))

  // Rows with no address yet are dropped on the way out, so a half-filled row
  // cannot fail the save.
  const payload = JSON.stringify(rows.filter((row) => row.url.trim() !== ''))

  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-sm font-bold">Other links</legend>
      <p className="text-xs text-[var(--color-muted)]">
        Social pages and anything else. Shown on the website and in the app, in this order.
      </p>

      <input type="hidden" name="links" value={payload} />

      {rows.length === 0 && (
        <p className="py-1 text-sm text-[var(--color-muted)]">No other links yet.</p>
      )}

      {rows.map((row, index) => (
        <div key={index} className="flex flex-wrap items-start gap-2">
          <Select
            name={`link-type-${index}`}
            aria-label={`Link ${index + 1} type`}
            defaultValue={row.type}
            onChange={(value) => update(index, { type: value as LinkType })}
            options={LINK_TYPES.map((type) => ({ value: type, label: LABELS[type] }))}
            className="w-40 shrink-0"
          />
          <Input
            aria-label={`Link ${index + 1} address`}
            value={row.url}
            onChange={(event) => update(index, { url: event.target.value })}
            placeholder="https://facebook.com/…"
            className="min-w-0 flex-1"
            type="url"
          />
          <button
            type="button"
            onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
            aria-label={`Remove link ${index + 1}`}
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-lg text-[var(--color-muted)] transition hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)]"
          >
            <span aria-hidden>×</span>
          </button>
        </div>
      ))}

      {rows.length < MAX_LINKS && (
        <button
          type="button"
          onClick={() => setRows((current) => [...current, { type: 'facebook', url: '' }])}
          className="rounded-full px-3 py-1.5 text-xs font-bold text-[var(--color-accent)] transition hover:bg-[var(--color-accent-soft)]"
        >
          Add a link
        </button>
      )}
    </fieldset>
  )
}
