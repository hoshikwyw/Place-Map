'use client'

import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef, useState } from 'react'
import type { Map as MapLibreMap, Marker } from 'maplibre-gl'
import { logoColors, type Category, type PlaceSummary } from '@place-map/shared'
import { t, type Locale } from '@/lib/i18n'

/**
 * Every place on one map.
 *
 * MapLibre with OpenFreeMap tiles: open-source renderer, free vector tiles, no
 * API key, no account, no card. Google Maps would need a Google Cloud billing
 * account, which this project deliberately does not have.
 *
 * The map is built once and then only its markers change, so filtering by
 * category does not tear down and refetch the tiles.
 */

const STYLE = process.env.NEXT_PUBLIC_MAP_STYLE ?? 'https://tiles.openfreemap.org/styles/liberty'

export function MapExplorer({
  places,
  categories,
  locale,
}: {
  /** Only places with coordinates reach here. */
  places: PlaceSummary[]
  categories: Category[]
  locale: Locale
}) {
  const text = t(locale)
  const [filter, setFilter] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)
  // The map is built asynchronously (the library is imported on demand), so the
  // marker effect below must wait for it - and must re-run once it is there,
  // which a ref alone would never trigger.
  const [ready, setReady] = useState(false)

  const container = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibreMap | null>(null)
  const markers = useRef<Marker[]>([])
  const you = useRef<Marker | null>(null)
  const library = useRef<typeof import('maplibre-gl') | null>(null)

  const visible = filter ? places.filter((place) => place.category.slug === filter) : places

  // Build the map once.
  useEffect(() => {
    if (!container.current || map.current) return
    let cancelled = false

    ;(async () => {
      const maplibregl = (await import('maplibre-gl')).default
      if (cancelled || !container.current) return
      library.current = maplibregl

      const instance = new maplibregl.Map({
        container: container.current,
        style: STYLE,
        center: [places[0]?.location?.lng ?? 96.16, places[0]?.location?.lat ?? 16.78],
        zoom: 12,
        attributionControl: { compact: true },
      })
      instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
      map.current = instance
      instance.on('load', () => {
        if (!cancelled) setReady(true)
      })
    })()

    return () => {
      cancelled = true
      setReady(false)
      map.current?.remove()
      map.current = null
    }
  }, [places])

  // Draw the markers for whatever is visible, and frame them.
  useEffect(() => {
    const instance = map.current
    const maplibregl = library.current
    if (!ready || !instance || !maplibregl) return

    for (const marker of markers.current) marker.remove()
    markers.current = []

    const bounds = new maplibregl.LngLatBounds()

    for (const place of visible) {
      if (!place.location) continue

      const popup = new maplibregl.Popup({ offset: 24, closeButton: false })
      // DOM nodes rather than setHTML: place names come from the database, and
      // interpolating them into HTML is how XSS gets in.
      const card = document.createElement('div')
      const link = document.createElement('a')
      link.href = `/${locale}/p/${place.slug}`
      link.textContent = place.name
      link.className = 'block text-sm font-bold'
      const meta = document.createElement('span')
      meta.textContent = place.category.name
      meta.className = 'block text-xs opacity-70'
      card.append(link, meta)
      popup.setDOMContent(card)

      const marker = new maplibregl.Marker({ color: logoColors.gradientFrom })
        .setLngLat([place.location.lng, place.location.lat])
        .setPopup(popup)
        .addTo(instance)

      markers.current.push(marker)
      bounds.extend([place.location.lng, place.location.lat])
    }

    if (!bounds.isEmpty()) {
      instance.fitBounds(bounds, { padding: 64, maxZoom: 15, duration: 400 })
    }
  }, [visible, locale, ready])

  /** Centres on the visitor. Asked for only when they press the button. */
  const locate = () => {
    const instance = map.current
    const maplibregl = library.current
    if (!instance || !maplibregl || !('geolocation' in navigator)) return

    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point: [number, number] = [position.coords.longitude, position.coords.latitude]
        you.current?.remove()
        you.current = new maplibregl.Marker({ color: logoColors.gradientTo }).setLngLat(point).addTo(instance)
        instance.flyTo({ center: point, zoom: 14 })
        setLocating(false)
      },
      () => setLocating(false),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    )
  }

  const chip =
    'shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-bold transition'
  const idle =
    'border-[var(--color-line)] bg-[var(--color-surface)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]'
  const active = 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-on-accent)]'

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label={text.categories} className="min-w-0 w-full sm:w-auto sm:flex-1">
          <ul className="no-scrollbar flex gap-2 overflow-x-auto px-1 py-1">
            <li>
              <button type="button" onClick={() => setFilter(null)} aria-pressed={filter === null} className={`${chip} ${filter === null ? active : idle}`}>
                {text.allPlaces}
              </button>
            </li>
            {categories.map((category) => (
              <li key={category.id}>
                <button
                  type="button"
                  onClick={() => setFilter(category.slug)}
                  aria-pressed={filter === category.slug}
                  className={`${chip} ${filter === category.slug ? active : idle}`}
                >
                  {category.icon} {category.name}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex shrink-0 items-center gap-3 px-1">
          <p className="text-sm font-semibold text-[var(--color-muted)]">{text.places(visible.length)}</p>
          <button
            type="button"
            onClick={locate}
            disabled={locating}
            className="whitespace-nowrap rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-2 text-sm font-bold transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-60"
          >
            {locating ? text.mapLocating : text.mapLocate}
          </button>
        </div>
      </div>

      <div
        ref={container}
        role="application"
        aria-label={text.map}
        className="h-[70vh] min-h-80 w-full overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-tint-soft)]"
      />

      {/* The map is a picture to a screen reader; the same places as a list. */}
      <details className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
        <summary className="cursor-pointer text-sm font-bold">{text.mapList}</summary>
        <ul className="mt-3 space-y-2">
          {visible.map((place) => (
            <li key={place.id}>
              <a href={`/${locale}/p/${place.slug}`} className="text-sm font-semibold hover:text-[var(--color-accent)]">
                {place.name}
                <span className="ml-2 font-normal text-[var(--color-muted)]">{place.category.name}</span>
              </a>
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}
