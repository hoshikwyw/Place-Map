import type { MetadataRoute } from 'next'
import { light } from '@place-map/shared'
import { DEFAULT_LOCALE, t } from '@/lib/i18n'

/**
 * What a phone needs to install this as an app.
 *
 * Worth having before the Expo app exists: a store download costs real money
 * on mobile data here, while this is already on the device the moment someone
 * visits. The two can coexist - whichever a person has, the places are the
 * same.
 *
 * `start_url` carries the default language rather than "/": a launcher icon
 * should open the site, not a redirect, and the language switcher is right
 * there for anyone who wants the other one.
 */
export default function manifest(): MetadataRoute.Manifest {
  const text = t(DEFAULT_LOCALE)

  return {
    name: text.siteName,
    short_name: text.siteName,
    description: text.tagline,
    start_url: `/${DEFAULT_LOCALE}`,
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    // The light canvas either way: this colour paints the window before any
    // CSS runs, and a dark flash on a light phone looks like a fault.
    background_color: light.canvas,
    theme_color: light.accent,
    categories: ['travel', 'food', 'navigation'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // Cropped by the launcher to its own shape, so this one is drawn with
      // room around the mark.
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
