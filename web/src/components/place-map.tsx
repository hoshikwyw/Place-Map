'use client'

import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef } from 'react'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { addPin, createMap, fitToPins, type MapPin } from '@/lib/map'

export type { MapPin }

/**
 * MapLibre with OpenFreeMap tiles: open-source renderer, free vector tiles, no
 * API key, no account, no card. Google Maps would need a Google Cloud billing
 * account; raw openstreetmap.org tiles forbid production use.
 *
 * The ~200 KB library is imported inside the effect, so it is fetched only on
 * pages that actually show a map, and only after the page is interactive -
 * never on the critical path. The map's own settings live in lib/map, shared
 * with the explorer so the two cannot drift.
 */
export function PlaceMap({ pins, className = 'h-72' }: { pins: MapPin[]; className?: string }) {
  const container = useRef<HTMLDivElement>(null)

  // Pins arrive as a fresh array on every render; key the effect on their
  // content so the map is not torn down and rebuilt for nothing.
  const key = pins.map((p) => `${p.id}:${p.lat}:${p.lng}`).join('|')

  useEffect(() => {
    if (!container.current || pins.length === 0) return

    let map: MapLibreMap | undefined
    let cancelled = false

    ;(async () => {
      const maplibregl = await import('maplibre-gl')
      if (cancelled || !container.current) return

      map = createMap(maplibregl, {
        container: container.current,
        center: [pins[0]!.lng, pins[0]!.lat],
        zoom: 14,
        // Inside a scrolling article: the wheel belongs to the page.
        cooperativeGestures: true,
      })

      for (const pin of pins) {
        const label = document.createElement(pin.href ? 'a' : 'span')
        label.textContent = pin.name
        label.className = 'text-sm font-bold'
        if (pin.href && label instanceof HTMLAnchorElement) label.href = pin.href

        addPin(maplibregl, map, pin, label)
      }

      // A single pin is already the centre; only a group needs framing.
      if (pins.length > 1) fitToPins(maplibregl, map, pins, { maxZoom: 15, duration: 0 })
    })()

    return () => {
      cancelled = true
      map?.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  if (pins.length === 0) return null

  return (
    <div
      ref={container}
      className={`w-full overflow-hidden rounded-lg border border-[var(--color-line)] bg-[var(--color-canvas)] ${className}`}
    />
  )
}
