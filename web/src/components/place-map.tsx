'use client'

import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef } from 'react'
import type { Map as MapLibreMap } from 'maplibre-gl'

export interface MapPin {
  id: number
  name: string
  lat: number
  lng: number
  href?: string
}

/**
 * MapLibre with OpenFreeMap tiles: open-source renderer, free vector tiles, no
 * API key, no account, no card. Google Maps would need a Google Cloud billing
 * account; raw openstreetmap.org tiles forbid production use.
 *
 * The ~200 KB library is imported inside the effect, so it is fetched only on
 * pages that actually show a map, and only after the page is interactive -
 * never on the critical path.
 */
const STYLE = process.env.NEXT_PUBLIC_MAP_STYLE ?? 'https://tiles.openfreemap.org/styles/liberty'

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
      const maplibregl = (await import('maplibre-gl')).default
      if (cancelled || !container.current) return

      map = new maplibregl.Map({
        container: container.current,
        style: STYLE,
        center: [pins[0]!.lng, pins[0]!.lat],
        zoom: 14,
        attributionControl: { compact: true },
        // A map inside a scrolling page should not hijack the scroll wheel.
        cooperativeGestures: true,
      })

      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

      for (const pin of pins) {
        const popup = new maplibregl.Popup({ offset: 24, closeButton: false })
        // Built with DOM nodes rather than setHTML: place names come from the
        // database, and interpolating them into HTML is how XSS gets in.
        const label = document.createElement(pin.href ? 'a' : 'span')
        label.textContent = pin.name
        label.className = 'text-sm font-medium'
        if (pin.href && label instanceof HTMLAnchorElement) label.href = pin.href
        popup.setDOMContent(label)

        new maplibregl.Marker({ color: '#0f766e' }).setLngLat([pin.lng, pin.lat]).setPopup(popup).addTo(map)
      }

      if (pins.length > 1) {
        const bounds = new maplibregl.LngLatBounds()
        for (const pin of pins) bounds.extend([pin.lng, pin.lat])
        map.fitBounds(bounds, { padding: 48, maxZoom: 15, duration: 0 })
      }
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
