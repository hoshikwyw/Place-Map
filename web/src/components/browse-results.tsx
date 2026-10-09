'use client'

import { useMemo, useState } from 'react'
import { distanceMeters, isOpenAt, type Amenity, type PlaceSummary } from '@place-map/shared'
import { PlaceCard } from '@/components/place-card'
import { PlaceFilters, type LiveFilters } from '@/components/place-filters'
import { t, type Locale } from '@/lib/i18n'

/**
 * A filtered grid of places.
 *
 * The server has already narrowed by price and amenities - those are facts
 * about a place and travel in the URL. What is left to do here is the two
 * things a server cannot answer: whether a place is open *now*, and which
 * places are nearest to *this* reader.
 *
 * Doing them here also keeps the visitor's location on their device: it is
 * never put in a URL and never sent anywhere.
 */
export function BrowseResults({
  places,
  catalog,
  locale,
  timeZone,
  total,
  showCategory = false,
}: {
  places: PlaceSummary[]
  catalog: Amenity[]
  locale: Locale
  timeZone: string
  /** Across every page, so the count can say "12 of 40". */
  total: number
  showCategory?: boolean
}) {
  const text = t(locale)
  const [live, setLive] = useState<LiveFilters>({ openNow: false, near: null })

  const shown = useMemo(() => {
    // A new Date on every pass: "open now" has to mean now, not when the page
    // was built.
    const now = new Date()

    let result = places
    if (live.openNow) {
      result = result.filter((place) => isOpenAt(place.opening_hours, now, timeZone)?.open)
    }

    if (live.near) {
      const from = live.near
      result = [...result].sort((a, b) => {
        // A place with no coordinates cannot be near anything, so it sinks
        // rather than claiming to be at the equator.
        const left = a.location ? distanceMeters(from, a.location) : Number.POSITIVE_INFINITY
        const right = b.location ? distanceMeters(from, b.location) : Number.POSITIVE_INFINITY
        return left - right
      })
    }

    return result
  }, [places, live, timeZone])

  return (
    <>
      <PlaceFilters
        locale={locale}
        catalog={catalog}
        live={live}
        onLiveChange={setLive}
        matching={shown.length}
        total={total}
      />

      {shown.length === 0 ? (
        <p className="py-8 text-center text-[var(--color-muted)]">{text.filterNothingMatches}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((place) => (
            // The card is its own list item.
            <PlaceCard
              key={place.id}
              place={place}
              locale={locale}
              timeZone={timeZone}
              showCategory={showCategory}
              distanceM={live.near && place.location ? distanceMeters(live.near, place.location) : null}
            />
          ))}
        </ul>
      )}
    </>
  )
}
