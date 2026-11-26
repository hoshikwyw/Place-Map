'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useId, useState, useTransition } from 'react'
import type { Amenity } from '@place-map/shared'
import { t, type Locale } from '@/lib/i18n'
import { AmenityIcon } from './amenities'

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

/**
 * The URL half of the filters - price and amenities - and whether a change to
 * it is still loading.
 *
 * A hook rather than state inside PlaceFilters, because the results need it
 * too: while the server works on a new filter, it is the old list that is on
 * screen, and it has to look stale rather than final. And the empty state
 * below the grid needs a way to clear what caused it.
 */
export function useFilterUrl() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()

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
    startTransition(() => router.push(query.size ? `${pathname}?${query}` : pathname, { scroll: false }))
  }

  return { pending, selected, toggle, clear }
}

export type FilterUrl = ReturnType<typeof useFilterUrl>

export function PlaceFilters({
  locale,
  catalog,
  url,
  live,
  onLiveChange,
  onClear,
  matching,
  total,
}: {
  locale: Locale
  /** Amenities offered as chips - the ones the directory actually defines. */
  catalog: Amenity[]
  url: FilterUrl
  live: LiveFilters
  onLiveChange: (next: LiveFilters) => void
  /** Clears both halves: the URL filters and the live ones. */
  onClear: () => void
  /** How many places survive the browser-side filters. */
  matching: number
  total: number
}) {
  const text = t(locale)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState(false)
  const priceLabelId = useId()

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

  const prices = url.selected('price')
  const amenities = url.selected('amenities')
  const anyFilter = prices.length > 0 || amenities.length > 0 || live.openNow || live.near !== null

  /*
   * One sliding row each on a phone, wrapping from sm. Wrapped, the two live
   * filters, four price levels and up to a dozen amenities stacked four rows
   * deep and pushed every result below the fold. Sliding, they cost two rows,
   * and the chip cut off at the edge says there are more - the same pattern
   * as the category strip, so it is not a new thing to learn.
   */
  const row = 'no-scrollbar flex items-center gap-2 overflow-x-auto px-1 py-1 sm:flex-wrap sm:overflow-visible'

  return (
    <div className="mb-6 space-y-2">
      <div className={row}>
        <Chip active={live.openNow} onClick={() => onLiveChange({ ...live, openNow: !live.openNow })}>
          <ClockIcon />
          {text.filterOpenNow}
        </Chip>

        <Chip active={live.near !== null} onClick={askLocation} disabled={locating}>
          <CrosshairIcon pulsing={locating} />
          {locating ? text.filterLocating : text.filterNearest}
        </Chip>

        <span className="mx-1 h-6 w-px shrink-0 bg-[var(--color-line)]" aria-hidden />

        {/* Named as a group, so the three levels read as one choice - to the
            eye by the label, to a screen reader by the group's name. */}
        <span role="group" aria-labelledby={priceLabelId} className="flex shrink-0 items-center gap-2">
          <span id={priceLabelId} className="pl-1 pr-0.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            {text.price}
          </span>
          {text.priceLevels.map((label, index) => (
            <Chip
              key={label}
              active={prices.includes(String(index + 1))}
              onClick={() => url.toggle('price', String(index + 1))}
            >
              {label}
            </Chip>
          ))}
        </span>
      </div>

      {catalog.length > 0 && (
        <div className={row}>
          {catalog.map((amenity) => (
            <Chip
              key={amenity.slug}
              active={amenities.includes(amenity.slug)}
              onClick={() => url.toggle('amenities', amenity.slug)}
            >
              <AmenityIcon amenity={amenity} className="" />
              {amenity.name}
            </Chip>
          ))}
        </div>
      )}

      <div className="flex min-h-11 flex-wrap items-center gap-x-3 px-1 text-sm text-[var(--color-muted)]">
        {/* The count and the location error share one live region, so both
            are announced - the error used to appear in silence. */}
        <p aria-live="polite" className="flex flex-wrap items-center gap-x-3">
          <span className="font-semibold text-[var(--color-ink)]">
            {matching === total ? text.places(total) : text.filterMatching(matching, total)}
          </span>
          {locationError && <span className="text-[var(--color-danger)]">{text.filterNoLocation}</span>}
        </p>
        {anyFilter && (
          <button
            type="button"
            onClick={onClear}
            className="btn btn-ghost min-h-9 px-3 text-[var(--color-accent)] pointer-coarse:min-h-11"
          >
            {text.filterClear}
          </button>
        )}
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
      className="chip"
    >
      {children}
    </button>
  )
}

const iconProps = {
  'aria-hidden': true,
  viewBox: '0 0 24 24',
  width: 16,
  height: 16,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

/** "Open now": a clock, the hours it is judged by. */
function ClockIcon() {
  return (
    <svg {...iconProps} className="shrink-0">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  )
}

/** "Nearest": the where-am-I crosshair, pulsing while it finds out. */
function CrosshairIcon({ pulsing }: { pulsing: boolean }) {
  return (
    <svg {...iconProps} className={`shrink-0 ${pulsing ? 'animate-pulse' : ''}`}>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  )
}
