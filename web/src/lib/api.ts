import 'server-only'
import {
  LIMIT_MAX,
  type Amenity,
  type Category,
  type ListResponse,
  type Meta,
  type Place,
  type PlaceSummary,
} from '@place-map/shared'
import { REVALIDATE_SECONDS, config } from './config'
import type { Locale } from './i18n'

/**
 * The web app is a client of the public API and nothing else - no Supabase, no
 * route handlers of its own. Everything here runs on the server; the one
 * browser-side call is the chat assistant (components/assistant.tsx), which
 * needs the visitor's location. The native app will make exactly these calls, so
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

/** 10 pages of 50 - 500 places. Past that the map needs clustering, not more pins. */
const MAX_MAP_PAGES = 10

/**
 * A connection that never reached the API - the Worker is not running, the
 * URL is wrong, or the network is down. Undici reports all of those as a bare
 * "fetch failed", which names neither the address it tried nor what to do, so
 * it is rewritten here into something a reader can act on.
 */
function unreachable(url: string, cause: unknown): Error {
  const target = new URL(url).origin
  return new Error(
    `Cannot reach the API at ${target}. Start it with "pnpm dev" in api/, or check the API URL in this app’s environment.`,
    { cause },
  )
}
async function get<T>(path: string, locale: Locale, revalidate = REVALIDATE_SECONDS): Promise<T> {
  const separator = path.includes('?') ? '&' : '?'
  const url = `${config.apiUrl}${path}${separator}lang=${locale}`

  let response: Response
  try {
    response = await fetch(url, { next: { revalidate, tags: ['api'] } })
  } catch (error) {
    throw unreachable(url, error)
  }

  if (response.status === 404) throw new NotFoundError(path)
  if (!response.ok) throw new Error(`API ${path} failed with ${response.status}`)

  return (await response.json()) as T
}

/**
 * The amenity catalog. A place stores slugs, so a page that shows amenity
 * chips needs this to label them - cached for the same five minutes as
 * categories, which it behaves exactly like.
 */
export async function getAmenities(locale: Locale): Promise<Amenity[]> {
  const body = await get<ListResponse<Amenity>>('/v1/amenities', locale, REVALIDATE_SECONDS)
  return body.data
}

export async function getCategories(locale: Locale): Promise<Category[]> {
  // Five minutes, the same as places. An hour was right while a category was
  // just a name and an emoji; now that its icon can be replaced from the
  // dashboard, an hour means an edit appears on the cards long before it
  // appears on the chips.
  const body = await get<ListResponse<Category>>('/v1/categories', locale, REVALIDATE_SECONDS)
  return body.data
}

/**
 * The filters a browse page can pass through to the API: facts about a place,
 * so the database can do the narrowing and paging stays honest. "Open now" and
 * "nearest first" are not here - see components/browse-results.
 */
export interface BrowseFilters {
  price?: string
  amenities?: string
}

/** Only the filters that were actually asked for, as query string parts. */
function filterParams(filters: BrowseFilters = {}): string {
  const params = new URLSearchParams()
  if (filters.price) params.set('price', filters.price)
  if (filters.amenities) params.set('amenities', filters.amenities)
  const query = params.toString()
  return query ? `&${query}` : ''
}

export async function getCategoryPlaces(
  locale: Locale,
  slug: string,
  page: number,
  limit: number,
  filters?: BrowseFilters,
): Promise<{ data: PlaceSummary[]; meta: Meta }> {
  return get<ListResponse<PlaceSummary>>(
    `/v1/categories/${encodeURIComponent(slug)}/places?page=${page}&limit=${limit}${filterParams(filters)}`,
    locale,
  )
}

/** Every active place across all categories - the home page's unfiltered list. */
export async function getPlaces(
  locale: Locale,
  page: number,
  limit: number,
  filters?: BrowseFilters,
): Promise<{ data: PlaceSummary[]; meta: Meta }> {
  return get<ListResponse<PlaceSummary>>(
    `/v1/places?page=${page}&limit=${limit}${filterParams(filters)}`,
    locale,
  )
}

/**
 * Every active place, for the map.
 *
 * The API caps a page at LIMIT_MAX, so this walks the pages. It is bounded:
 * a directory of this kind holds hundreds of places, not millions, and the
 * result is cached for REVALIDATE_SECONDS like everything else - so the walk
 * happens once per five minutes, not once per visitor.
 */
export async function getAllPlaces(locale: Locale): Promise<PlaceSummary[]> {
  const all: PlaceSummary[] = []

  for (let page = 1; page <= MAX_MAP_PAGES; page++) {
    const { data, meta } = await getPlaces(locale, page, LIMIT_MAX)
    all.push(...data)
    if (!meta.has_more) break
  }

  return all
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
  filters?: BrowseFilters,
): Promise<{ data: PlaceSummary[]; meta: Meta }> {
  // Search results revalidate fastest: the key space is unbounded and mostly
  // one-off, so long caching buys little and holds stale results.
  return get<ListResponse<PlaceSummary>>(
    `/v1/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}${filterParams(filters)}`,
    locale,
    60,
  )
}
