'use client'

import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef, useState } from 'react'
import type { Map as MapLibreMap, Marker } from 'maplibre-gl'
import { logoColors, type Category, type PlaceSummary } from '@place-map/shared'
import { addPin, createMap, fitToPins, labelHaloColor } from '@/lib/map'
import { t, type Locale } from '@/lib/i18n'
import { CategoryIcon } from './category-icon'

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


/**
 * The stock map style is drawn for a full-screen desktop map; in a page-sized
 * one its street names are too small to read, and Myanmar script suffers most -
 * its marks sit above and below the line and are the first thing to disappear.
 *
 * So every text layer is scaled up and given a stronger halo once the style
 * loads. Editing the loaded style rather than hosting a fork of it keeps the
 * tiles free and the style updates coming from upstream.
 */
const LABEL_SCALE = 1.3

/**
 * Multiplies a text-size value, whatever shape the style wrote it in.
 *
 * Most label layers size their text with a zoom-driven `interpolate` or
 * `step` expression, and those may only appear at the top level - wrapping one
 * in `["*", ..., 1.3]` is rejected by the style spec. So the numbers *inside*
 * the expression are scaled instead, which is the same intent expressed legally.
 */
function scaleTextSize(value: unknown, scale: number): unknown {
  if (value === undefined || value === null) return 16 * scale // MapLibre's default
  if (typeof value === 'number') return value * scale
  if (!Array.isArray(value)) return value

  const scaleStop = (stop: unknown) => (typeof stop === 'number' ? stop * scale : stop)
  const [operator, ...rest] = value

  // ["interpolate", interpolation, input, stop, output, stop, output, ...]
  if (operator === 'interpolate' || operator === 'interpolate-hcl' || operator === 'interpolate-lab') {
    const [interpolation, input, ...stops] = rest
    return [operator, interpolation, input, ...stops.map((entry, index) => (index % 2 === 1 ? scaleStop(entry) : entry))]
  }

  // ["step", input, default, stop, output, ...]
  if (operator === 'step') {
    const [input, fallback, ...stops] = rest
    return [operator, input, scaleStop(fallback), ...stops.map((entry, index) => (index % 2 === 1 ? scaleStop(entry) : entry))]
  }

  // Anything else is left alone rather than guessed at.
  return value
}

function makeLabelsReadable(instance: MapLibreMap) {
  for (const layer of instance.getStyle().layers ?? []) {
    if (layer.type !== 'symbol') continue
    // Icon-only layers have nothing to make readable, and writing text
    // properties onto them logs a warning for no effect.
    if (!instance.getLayoutProperty(layer.id, 'text-field')) continue

    try {
      const size = instance.getLayoutProperty(layer.id, 'text-size')
      instance.setLayoutProperty(layer.id, 'text-size', scaleTextSize(size, LABEL_SCALE))
      // A halo is what makes a label readable over a road or a park - in
      // the map's own ground colour: white on the light map, midnight on
      // the dark one, where a white halo would glow round every name.
      instance.setPaintProperty(layer.id, 'text-halo-color', labelHaloColor())
      instance.setPaintProperty(layer.id, 'text-halo-width', 1.6)
    } catch {
      // One stubborn layer must not stop the rest being adjusted.
    }
  }
}

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
      const maplibregl = await import('maplibre-gl')
      if (cancelled || !container.current) return
      library.current = maplibregl

      const instance = createMap(maplibregl, {
        container: container.current,
        center: [places[0]?.location?.lng ?? 96.16, places[0]?.location?.lat ?? 16.78],
        zoom: 12,
        // This map is the page, so the wheel should zoom it as any map does.
        cooperativeGestures: false,
        // On every style, not just the first: switching theme loads a new
        // one, which comes with its own small labels again.
        onStyleLoad: (loaded) => {
          if (!cancelled) makeLabelsReadable(loaded)
        },
      })
      map.current = instance
      instance.on('load', () => {
        if (cancelled) return
        setReady(true)
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

    const located: { lat: number; lng: number }[] = []

    for (const place of visible) {
      if (!place.location) continue

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

      const { marker } = addPin(maplibregl, instance, place.location, card)
      markers.current.push(marker)
      located.push(place.location)
    }

    // Follows the filter, down to a single place.
    fitToPins(maplibregl, instance, located, { maxZoom: 16, duration: 400 })
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

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label={text.categories} className="min-w-0 w-full sm:w-auto sm:flex-1">
          <ul className="no-scrollbar flex gap-2 overflow-x-auto px-1 py-1">
            <li>
              <button type="button" onClick={() => setFilter(null)} aria-pressed={filter === null} className="chip">
                {text.allPlaces}
              </button>
            </li>
            {categories.map((category) => (
              <li key={category.id}>
                <button
                  type="button"
                  onClick={() => setFilter(category.slug)}
                  aria-pressed={filter === category.slug}
                  className="chip"
                >
                  <CategoryIcon category={category} size={18} />
                  {category.name}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex shrink-0 items-center gap-3 px-1">
          <p className="text-sm font-semibold text-[var(--color-muted)]">{text.places(visible.length)}</p>
          <button type="button" onClick={locate} disabled={locating} className="btn btn-secondary">
            {/* A crosshair: "where I am", the same mark every map app uses. */}
            <svg aria-hidden viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className={`shrink-0 ${locating ? 'animate-pulse' : ''}`}>
              <circle cx="12" cy="12" r="7" />
              <circle cx="12" cy="12" r="2.5" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            </svg>
            {locating ? text.mapLocating : text.mapLocate}
          </button>
        </div>
      </div>

      <div
        ref={container}
        role="application"
        aria-label={text.map}
        className="surface surface-raised h-[70vh] min-h-80 w-full overflow-hidden rounded-[var(--brand-radius-xl)] bg-[var(--color-tint-soft)]"
      />

      {/* The map is a picture to a screen reader; the same places as a list. */}
      <details className="surface group overflow-hidden">
        {/* A full-width row with a turning chevron: the whole bar is the
            target, and the chevron says it opens. */}
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-5 text-sm font-bold [&::-webkit-details-marker]:hidden">
          {text.mapList}
          <svg aria-hidden viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[var(--color-muted)] transition group-open:rotate-180">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </summary>
        <ul className="divide-y divide-[var(--color-line)] border-t border-[var(--color-line)]">
          {visible.map((place) => (
            <li key={place.id}>
              {/* inline-block with padding: this is the list someone uses
                  instead of the map, so each row has to be tappable. */}
              <a
                href={`/${locale}/p/${place.slug}`}
                className="flex min-h-11 items-center justify-between gap-3 px-5 py-2 text-sm font-semibold transition hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)]"
              >
                <span className="min-w-0 break-words">{place.name}</span>
                <span className="inline-flex shrink-0 items-center gap-1.5 font-normal text-[var(--color-muted)]">
                  <CategoryIcon category={place.category} size={14} />
                  {place.category.name}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}
