import { dark, light, logoColors } from '@place-map/shared'
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

/**
 * The map for the dark theme. The light map was the one bright block left on
 * a midnight page - a full-width panel of white streets on the map page.
 * Same provider, same tiles, so still no key and no account.
 */
export const MAP_STYLE_DARK =
  process.env.NEXT_PUBLIC_MAP_STYLE_DARK ?? 'https://tiles.openfreemap.org/styles/dark'

const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)')

/**
 * Whether the page is in its dark theme right now: the visitor's choice on
 * <html data-theme>, else the system's - the same rule brand.css follows.
 */
export function isDarkTheme(): boolean {
  const chosen = document.documentElement.dataset.theme
  if (chosen === 'dark') return true
  if (chosen === 'light') return false
  return prefersDark().matches
}

/** The ground a map label's halo is drawn in, for the current theme. */
export function labelHaloColor(): string {
  return isDarkTheme() ? dark.canvas : light.surface
}

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
    /**
     * Runs every time a style finishes loading - the first one, and again
     * after each theme switch, because a new style discards any property
     * changes made to the old one's layers.
     */
    onStyleLoad?: (map: MapLibreMap) => void
  },
): MapLibreMap {
  const styleFor = () => (isDarkTheme() ? MAP_STYLE_DARK : MAP_STYLE)
  let current = styleFor()

  const map = new maplibregl.Map({
    container: options.container,
    style: current,
    center: options.center,
    zoom: options.zoom,
    attributionControl: { compact: true },
    cooperativeGestures: options.cooperativeGestures,
  })

  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

  if (options.onStyleLoad) {
    const onStyleLoad = options.onStyleLoad
    map.on('style.load', () => onStyleLoad(map))
  }

  // Follow the theme while the map is open: the toggle rewrites
  // <html data-theme>, and with no choice made the system can switch
  // (sunset, on some phones). Markers are separate DOM elements, so they
  // survive the style being swapped underneath them.
  const follow = () => {
    const next = styleFor()
    if (next === current) return
    current = next
    map.setStyle(next)
  }
  const observer = new MutationObserver(follow)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  const media = prefersDark()
  media.addEventListener('change', follow)
  map.on('remove', () => {
    observer.disconnect()
    media.removeEventListener('change', follow)
  })

  return map
}

/**
 * A pin in the logo's terracotta.
 *
 * Deliberately not a theme colour: one fixed mid-tone that reads on both the
 * light and the dark tiles, where a marker that followed the theme would sink
 * into one of them.
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

  const marker = new maplibregl.Marker({ color: options.color ?? logoColors.gradientTo })
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
