import { logoColors } from '@place-map/shared'
import type { LngLatLike, Map as MapLibreMap, Marker, Popup } from 'maplibre-gl'

/**
 * The settings both maps share - the place page's mini map and the explorer.
 *
 * Here rather than in each because they are the same map to a reader: the same
 * tiles, the same controls, the same marker colour. When they drifted apart it
 * was never on purpose.
 *
 * The library itself is never imported here. Both callers load maplibre-gl
 * dynamically - it is large, and a page that renders no map should not pay for
 * it - so the loaded namespace is passed in instead.
 */

type MapLibre = typeof import('maplibre-gl')

/** OpenFreeMap: no key, no account, no billing. Overridable for self-hosting. */
export const MAP_STYLE =
  process.env.NEXT_PUBLIC_MAP_STYLE ?? 'https://tiles.openfreemap.org/styles/liberty'

export interface MapPin {
  id: number
  name: string
  lat: number
  lng: number
  href?: string
}

/**
 * A map with the tiles and controls both views share.
 *
 * `cooperativeGestures` is the one thing they disagree about, so the caller
 * says: a map embedded in an article must not eat the page's scroll, while the
 * explorer *is* the page and should zoom on the wheel like any map.
 */
export function createMap(
  maplibregl: MapLibre,
  options: {
    container: HTMLElement
    center: LngLatLike
    zoom: number
    cooperativeGestures: boolean
  },
): MapLibreMap {
  const map = new maplibregl.Map({
    container: options.container,
    style: MAP_STYLE,
    center: options.center,
    zoom: options.zoom,
    attributionControl: { compact: true },
    cooperativeGestures: options.cooperativeGestures,
  })

  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
  return map
}

/**
 * A pin in the logo's violet.
 *
 * Deliberately not a theme colour: the tiles are light in both themes, so a
 * marker that followed the theme would vanish against them in dark mode.
 *
 * The popup takes a DOM node, never HTML. Place names come from the database,
 * and building markup out of them by hand is how XSS gets in.
 */
export function addPin(
  maplibregl: MapLibre,
  map: MapLibreMap,
  pin: { lat: number; lng: number },
  content: Node,
  options: { color?: string } = {},
): { marker: Marker; popup: Popup } {
  const popup = new maplibregl.Popup({ offset: 24, closeButton: false }).setDOMContent(content)

  const marker = new maplibregl.Marker({ color: options.color ?? logoColors.gradientFrom })
    .setLngLat([pin.lng, pin.lat])
    .setPopup(popup)
    .addTo(map)

  return { marker, popup }
}

/**
 * Frames the given pins. Whether a single pin is worth flying to is the
 * caller's call - the explorer follows a filter down to one place, the place
 * page already opens centred on its only pin.
 */
export function fitToPins(
  maplibregl: MapLibre,
  map: MapLibreMap,
  pins: { lat: number; lng: number }[],
  options: { maxZoom: number; duration: number },
): void {
  if (pins.length === 0) return

  const bounds = new maplibregl.LngLatBounds()
  for (const pin of pins) bounds.extend([pin.lng, pin.lat])
  map.fitBounds(bounds, { padding: 48, ...options })
}
