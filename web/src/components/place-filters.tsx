'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import type { Amenity } from '@place-map/shared'
import { t, type Locale } from '@/lib/i18n'

/**
 * Narrowing a list of places.
 *
 * Two kinds of control, and the difference is not cosmetic. Price and
 * amenities are facts about a place, so they travel in the URL: the server
 * filters, paging stays honest, and the result can be shared or bookmarked.
 *
 * "Open now" and "nearest first" are not facts about a place - one depends on
 * the clock, the other on where the reader is standing. Neither survives a
 * cached page, so both are applied in the browser to whatever the server sent,
 * and the parent reports how many are left.
 */

export interface LiveFilters {
  openNow: boolean
  near: { lat: number; lng: number } | null
}

export function PlaceFilters({
  locale,
  catalog,
  live,
  onLiveChange,
  matching,
  total,
}: {
  locale: Locale
  /** Amenities offered as chips - the ones the directory actually defines. */
  catalog: Amenity[]
  live: LiveFilters
  onLiveChange: (next: LiveFilters) => void
  /** How many places survive the browser-side filters. */
  matching: number
  total: number
}) {
  const text = t(locale)
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState(false)

  const selected = (key: 'price' | 'amenities') => (params.get(key) ?? '').split(',').filter(Boolean)

  /** Chips toggle: the URL is the state, so a reload keeps the filters. */
  const toggle = (key: 'price' | 'amenities', value: string) => {
    const current = selected(key)
    const next = current.includes(value)
      ? current.filter((entry) => entry !== value)
      : [...current, value]

    const query = new URLSearchParams(params.toString())
    if (next.length) query.set(key, next.join(','))
    else query.delete(key)
    // A narrowed list starts again at the first page; page 4 of the old list
    // is rarely page 4 of the new one.
    query.delete('page')

    startTransition(() => router.push(`${pathname}?${query}`, { scroll: false }))
  }

  const clear = () => {
    const query = new URLSearchParams(params.toString())
    for (const key of ['price', 'amenities', 'page']) query.delete(key)
    onLiveChange({ openNow: false, near: null })
    startTransition(() => router.push(query.size ? `${pathname}?${query}` : pathname, { scroll: false }))
  }

  const askLocation = () => {
    if (live.near) {
      onLiveChange({ ...live, near: null })
      return
    }
    if (!('geolocation' in navigator)) {
      setLocationError(true)
      return
    }

    setLocating(true)
    setLocationError(false)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onLiveChange({
          ...live,
          near: { lat: position.coords.latitude, lng: position.coords.longitude },
        })
        setLocating(false)
      },
      () => {
        setLocationError(true)
        setLocating(false)
      },
      // City-level accuracy is plenty for sorting, and much faster to get.
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    )
  }

  const prices = selected('price')
  const amenities = selected('amenities')
  const anyFilter = prices.length > 0 || amenities.length > 0 || live.openNow || live.near !== null

  return (
    <div className={`mb-6 space-y-3 ${pending ? 'opacity-60' : ''}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Chip active={live.openNow} onClick={() => onLiveChange({ ...live, openNow: !live.openNow })}>
          {text.filterOpenNow}
        </Chip>

        <Chip active={live.near !== null} onClick={askLocation} disabled={locating}>
          {locating ? text.filterLocating : text.filterNearest}
        </Chip>

        <span className="mx-1 h-5 w-px bg-[var(--color-line)]" aria-hidden />

        {text.priceLevels.map((label, index) => (
          <Chip
            key={label}
            active={prices.includes(String(index + 1))}
            onClick={() => toggle('price', String(index + 1))}
          >
            {label}
          </Chip>
        ))}
      </div>

      {catalog.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {catalog.map((amenity) => (
            <Chip
              key={amenity.slug}
              active={amenities.includes(amenity.slug)}
              onClick={() => toggle('amenities', amenity.slug)}
            >
              {amenity.icon ? `${amenity.icon} ${amenity.name}` : amenity.name}
            </Chip>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--color-muted)]">
        <span aria-live="polite">
          {matching === total ? text.places(total) : text.filterMatching(matching, total)}
        </span>
        {anyFilter && (
          <button type="button" onClick={clear} className="font-bold text-[var(--color-accent)] hover:underline">
            {text.filterClear}
          </button>
        )}
        {locationError && <span className="text-[var(--color-danger)]">{text.filterNoLocation}</span>}
      </div>
    </div>
  )
}

function Chip({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-semibold transition disabled:opacity-60 ${
        active
          ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-on-accent)]'
          : 'border-[var(--color-line)] bg-[var(--color-surface)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]'
      }`}
    >
      {children}
    </button>
  )
}
