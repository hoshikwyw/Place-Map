'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { PlaceSummary } from '@place-map/shared'
import { PlaceCard } from '@/components/place-card'
import { t, type Locale } from '@/lib/i18n'
import { useSaved } from '@/lib/saved'
import { EmptyState } from './feedback'

// Exposed to the browser by next.config.ts, like the chat panel's.
const API_URL = process.env.PLACE_MAP_PUBLIC_API_URL ?? ''

/**
 * The saved places, fetched fresh.
 *
 * This page cannot be rendered on the server: the list lives on the reader's
 * device and the server has never seen it. So the ids go up in one request -
 * which is why /v1/places takes `ids` - rather than one request per place on a
 * connection that may be paying by the megabyte.
 */
export function SavedList({ locale, timeZone }: { locale: Locale; timeZone: string }) {
  const text = t(locale)
  const { ready, ids, count, clear, prune } = useSaved()

  const [places, setPlaces] = useState<PlaceSummary[] | null>(null)
  const [failed, setFailed] = useState(false)

  // What was last asked for, so re-renders do not refetch the same list.
  const asked = useRef<string>('')

  useEffect(() => {
    if (!ready) return

    const key = ids.join(',')
    if (key === asked.current) return
    asked.current = key

    if (ids.length === 0) {
      setPlaces([])
      return
    }

    let cancelled = false
    setFailed(false)
    ;(async () => {
      try {
        const response = await fetch(
          `${API_URL}/v1/places?ids=${key}&lang=${locale}`,
          { cache: 'no-store' },
        )
        if (!response.ok) throw new Error(String(response.status))
        const body = (await response.json()) as { data: PlaceSummary[] }
        if (cancelled) return

        setPlaces(body.data)

        // A place that was hidden or deleted since it was saved never comes
        // back; drop it rather than asking for it on every visit.
        if (body.data.length < ids.length) prune(body.data.map((place) => place.id))
      } catch {
        if (!cancelled) setFailed(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [ready, ids, locale, prune])

  // Before the browser has read its own storage there is nothing truthful to
  // show: an empty state would be wrong for everyone who has saved something.
  if (!ready || (places === null && !failed)) {
    return <p className="py-12 text-center text-[var(--color-muted)]">{text.savedLoading}</p>
  }

  if (failed) {
    return <p className="py-12 text-center text-[var(--color-muted)]">{text.assistant.error}</p>
  }

  if (count === 0) {
    return (
      <EmptyState
        actions={
          <Link href={`/${locale}/search`} className="btn btn-primary">
            {text.savedBrowse}
          </Link>
        }
      >
        {text.savedEmpty}
      </EmptyState>
    )
  }

  // The saved order, newest first - the API returns them in its own order.
  const byId = new Map((places ?? []).map((place) => [place.id, place]))
  const ordered = ids.flatMap((id) => {
    const place = byId.get(id)
    return place ? [place] : []
  })

  return (
    <>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[var(--color-line)] pb-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="font-semibold">{text.places(ordered.length)}</span>
          {/* Said plainly, with a mark: there is no account, so the list does
              not follow anyone to another phone. */}
          <span className="inline-flex items-center gap-1.5 text-[var(--color-muted)]">
            <svg aria-hidden viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="shrink-0">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 11v5M12 8h.01" />
            </svg>
            {text.savedOnThisDevice}
          </span>
        </div>
        {/* Asks first. The list lives only in this browser - there is no
            copy anywhere to restore it from - so one stray tap used to lose
            everything with no way back. */}
        <button
          type="button"
          onClick={() => {
            if (window.confirm(text.savedClearConfirm)) clear()
          }}
          className="btn btn-ghost min-h-9 px-3 text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)] pointer-coarse:min-h-11"
        >
          {text.savedClear}
        </button>
      </div>

      <ul className="grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
        {ordered.map((place) => (
          <PlaceCard
            key={place.id}
            place={place}
            locale={locale}
            timeZone={timeZone}
            showCategory
          />
        ))}
      </ul>
    </>
  )
}
