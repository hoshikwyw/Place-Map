import 'server-only'
import type { Category, ListResponse, Meta, Place, PlaceSummary } from '@place-map/shared'
import { REVALIDATE_SECONDS, config } from './config'
import type { Locale } from './i18n'

/**
 * The web app is a client of the public API and nothing else - no Supabase, no
 * route handlers of its own. The native app will make exactly these calls, so
 * anything the site needs that the API cannot answer is a gap in the API, not
 * something to patch in here.
 *
 * Every call runs on the server and goes through Next's data cache for
 * REVALIDATE_SECONDS. That is what keeps a busy page from turning into a busy
 * Worker: a thousand visitors to one place page cost one API request per five
 * minutes, not a thousand.
 *
 * The language travels as `?lang=` rather than Accept-Language on purpose: the
 * data cache keys on the URL, and a header-keyed response risks one language's
 * page being served to another.
 */

export class NotFoundError extends Error {}

async function get<T>(path: string, locale: Locale, revalidate = REVALIDATE_SECONDS): Promise<T> {
  const separator = path.includes('?') ? '&' : '?'
  const url = `${config.apiUrl}${path}${separator}lang=${locale}`

  const response = await fetch(url, { next: { revalidate, tags: ['api'] } })

  if (response.status === 404) throw new NotFoundError(path)
  if (!response.ok) throw new Error(`API ${path} failed with ${response.status}`)

  return (await response.json()) as T
}

export async function getCategories(locale: Locale): Promise<Category[]> {
  // Categories change almost never; an hour matches the API's own max-age.
  const body = await get<ListResponse<Category>>('/v1/categories', locale, 3600)
  return body.data
}

export async function getCategoryPlaces(
  locale: Locale,
  slug: string,
  page: number,
  limit: number,
): Promise<{ data: PlaceSummary[]; meta: Meta }> {
  return get<ListResponse<PlaceSummary>>(
    `/v1/categories/${encodeURIComponent(slug)}/places?page=${page}&limit=${limit}`,
    locale,
  )
}

/** Every active place across all categories - the home page's unfiltered list. */
export async function getPlaces(
  locale: Locale,
  page: number,
  limit: number,
): Promise<{ data: PlaceSummary[]; meta: Meta }> {
  return get<ListResponse<PlaceSummary>>(`/v1/places?page=${page}&limit=${limit}`, locale)
}

export async function getPlace(locale: Locale, slug: string): Promise<Place> {
  const body = await get<{ data: Place }>(`/v1/places/${encodeURIComponent(slug)}`, locale)
  return body.data
}

export async function searchPlaces(
  locale: Locale,
  query: string,
  page: number,
  limit: number,
): Promise<{ data: PlaceSummary[]; meta: Meta }> {
  // Search results revalidate fastest: the key space is unbounded and mostly
  // one-off, so long caching buys little and holds stale results.
  return get<ListResponse<PlaceSummary>>(
    `/v1/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`,
    locale,
    60,
  )
}
