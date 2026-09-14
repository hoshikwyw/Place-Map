import type { Category, ListResponse, Place, PlaceSummary } from '@place-map/shared'
import { API_URL, PAGE_SIZE } from './config'
import type { Locale } from './i18n'

/**
 * The app is a client of the public /v1 API and nothing else - the same calls
 * the web app makes, with the same `?lang=` convention so every cache keys on
 * the URL rather than a header.
 */

export class NotFoundError extends Error {}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

/**
 * React Native's fetch has no timeout of its own. On a weak mobile connection a
 * stalled request would spin forever instead of failing over to cached data.
 */
const TIMEOUT_MS = 15_000

async function get<T>(path: string, locale: Locale): Promise<T> {
  if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL is not set - see mobile/.env.example')

  const separator = path.includes('?') ? '&' : '?'
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(`${API_URL}${path}${separator}lang=${locale}`, {
      signal: controller.signal,
    })
    if (response.status === 404) throw new NotFoundError(path)
    if (!response.ok) throw new ApiError(`API ${path} failed with ${response.status}`, response.status)
    return (await response.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchCategories(locale: Locale): Promise<Category[]> {
  const body = await get<ListResponse<Category>>('/v1/categories', locale)
  return body.data
}

export function fetchCategoryPlaces(locale: Locale, slug: string, page: number) {
  return get<ListResponse<PlaceSummary>>(
    `/v1/categories/${encodeURIComponent(slug)}/places?page=${page}&limit=${PAGE_SIZE}`,
    locale,
  )
}

export async function fetchPlace(locale: Locale, slug: string): Promise<Place> {
  const body = await get<{ data: Place }>(`/v1/places/${encodeURIComponent(slug)}`, locale)
  return body.data
}

export function searchPlaces(locale: Locale, query: string, page: number) {
  return get<ListResponse<PlaceSummary>>(
    `/v1/search?q=${encodeURIComponent(query)}&page=${page}&limit=${PAGE_SIZE}`,
    locale,
  )
}

/** For useInfiniteQuery: the next page number, or undefined when there is none. */
export function nextPage(last: ListResponse<unknown>): number | undefined {
  return last.meta.has_more ? last.meta.page + 1 : undefined
}
