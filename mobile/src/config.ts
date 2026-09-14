/**
 * Build-time settings from mobile/.env. Expo inlines EXPO_PUBLIC_* values when
 * it bundles, so changing one needs a restart of `expo start`, not just a
 * reload.
 */

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '')

/** The places' zone. "Open now" is meaningless in the phone's own zone. */
export const TIME_ZONE = process.env.EXPO_PUBLIC_TIME_ZONE ?? 'Asia/Tashkent'

/**
 * How long a response counts as fresh. Matches the API's max-age for places and
 * the web app's revalidate window, so all three clients agree on how quickly an
 * admin edit shows up.
 */
export const FRESH_MS = 5 * 60_000

/** Twelve rows fill a phone screen and a bit, so the next page loads before it is needed. */
export const PAGE_SIZE = 12
