import 'server-only'
import type {
  Meta,
  PlaceLink,
  ReviewRow,
  SuggestionRow,
  SuggestionStatus,
} from '@place-map/shared'
import { env } from './env'

/**
 * The dashboard's only route to data, and it runs on the server exclusively.
 *
 * `ADMIN_API_KEY` is attached here and never reaches the browser: reads happen
 * in server components, writes in server actions. That is also why the Worker's
 * CORS policy allows only GET and OPTIONS - even if the key leaked, a browser
 * could not spend it.
 */

/** Raw row as the write endpoints return it: jsonb intact, columns unflattened. */
export interface CategoryRow {
  id: number
  slug: string
  name: Record<string, string>
  icon: string | null
  /** Storage path of an uploaded icon, or null. */
  icon_image: string | null
  sort_order: number
  is_active: boolean
}

/** The amenity catalog, raw. Places reference these by `slug`, as text. */
export interface AmenityRow {
  id: number
  slug: string
  name: Record<string, string>
  icon: string | null
  /** Storage path of an uploaded icon, or null. */
  icon_image: string | null
  sort_order: number
  is_active: boolean
}

export interface PlaceRow {
  id: number
  category_id: number
  slug: string
  name: Record<string, string>
  description: Record<string, string> | null
  address: string | null
  lat: number | null
  lng: number | null
  phone: string | null
  website: string | null
  opening_hours: Record<string, [string, string][]> | null
  links?: PlaceLink[]
  // Flat, as the columns are: only the public API composes them into one
  // price object. The admin edits the columns.
  price_level?: number | null
  price_min?: number | null
  price_max?: number | null
  /** Slugs from the amenities table. */
  amenities?: string[]
  rating: number | null
  rating_count: number
  is_active: boolean
  sort_order: number
  /** Only the list endpoint fills this: enough to draw a thumbnail. */
  images?: { storage_path: string; sort_order: number }[]
}

export interface ImageRow {
  id: number
  place_id: number
  storage_path: string
  telegram_file_id: string | null
  width: number | null
  height: number | null
  sort_order: number
}

/** Thrown with the API's own message, which is written to be shown to a human. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

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
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${env.apiUrl}${path}`

  let response: Response
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': env.apiKey,
        ...init.headers,
      },
      // Admin screens must show what is actually stored, not a cached copy
      // from before the edit that brought the operator back to this page.
      cache: 'no-store',
    })
  } catch (error) {
    throw unreachable(url, error)
  }

  const body = (await response.json().catch(() => null)) as
    | { data?: T; error?: { message?: string } }
    | null

  if (!response.ok) {
    throw new ApiError(body?.error?.message ?? `Request failed (${response.status})`, response.status)
  }

  return body?.data as T
}

// ---------------------------------------------------------------------- reads
//
// These use `/v1/admin/*`, not the public routes. Two differences matter: the
// rows arrive raw, so an editor sees every translation at once, and inactive
// rows are included - the public API hides them, and something you cannot see
// is something you cannot publish again.

export const listCategories = () => request<CategoryRow[]>('/v1/admin/categories')

/**
 * Every place, not one page of them.
 *
 * The screens that count amenity usage have to see all of them: a count built
 * from the first page understates, and the delete warning that rests on it
 * would tell the operator a deletion costs less than it does. The admin list
 * endpoint caps a page at 100, so this walks the pages.
 *
 * Bounded rather than trusting the total: a wrong `total` would otherwise
 * spin here forever. The directory is planned for a few hundred places, so
 * twenty pages is far more than it should ever need.
 */
export async function listAllPlaces(): Promise<PlaceRow[]> {
  const PER_PAGE = 100
  const MAX_PAGES = 20

  const all: PlaceRow[] = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data, meta } = await listPlaces({ page, limit: PER_PAGE })
    all.push(...data)
    if (all.length >= meta.total || data.length < PER_PAGE) break
  }
  return all
}

export async function listPlaces(options: {
  categoryId?: number
  query?: string
  page?: number
  limit?: number
} = {}): Promise<{ data: PlaceRow[]; meta: Meta }> {
  const params = new URLSearchParams()
  if (options.categoryId) params.set('category_id', String(options.categoryId))
  if (options.query) params.set('q', options.query)
  params.set('page', String(options.page ?? 1))
  params.set('limit', String(options.limit ?? 50))

  const response = await fetch(`${env.apiUrl}/v1/admin/places?${params}`, {
    headers: { 'X-API-Key': env.apiKey },
    cache: 'no-store',
  })

  if (!response.ok) throw new ApiError('Could not load places', response.status)
  return (await response.json()) as { data: PlaceRow[]; meta: Meta }
}

export const getPlace = (id: number) => request<PlaceRow>(`/v1/admin/places/${id}`)

export const listImages = (placeId: number) =>
  request<ImageRow[]>(`/v1/admin/places/${placeId}/images`)

// --------------------------------------------------------------------- writes
// These return the raw row - an editor needs every translation, not one.

export const createCategory = (body: unknown) =>
  request<CategoryRow>('/v1/categories', { method: 'POST', body: JSON.stringify(body) })

export const updateCategory = (id: number, body: unknown) =>
  request<CategoryRow>(`/v1/categories/${id}`, { method: 'PATCH', body: JSON.stringify(body) })

export const deleteCategory = (id: number) =>
  request<CategoryRow>(`/v1/categories/${id}`, { method: 'DELETE' })

export const listAmenities = () => request<AmenityRow[]>('/v1/admin/amenities')

export const createAmenity = (body: unknown) =>
  request<AmenityRow>('/v1/amenities', { method: 'POST', body: JSON.stringify(body) })

export const updateAmenity = (id: number, body: unknown) =>
  request<AmenityRow>(`/v1/amenities/${id}`, { method: 'PATCH', body: JSON.stringify(body) })

export const deleteAmenity = (id: number) =>
  request<AmenityRow>(`/v1/amenities/${id}`, { method: 'DELETE' })

export const createPlace = (body: unknown) =>
  request<PlaceRow>('/v1/places', { method: 'POST', body: JSON.stringify(body) })

export const updatePlace = (id: number, body: unknown) =>
  request<PlaceRow>(`/v1/places/${id}`, { method: 'PATCH', body: JSON.stringify(body) })

export const deletePlace = (id: number) =>
  request<PlaceRow>(`/v1/places/${id}`, { method: 'DELETE' })

export const addImage = (placeId: number, body: unknown) =>
  request<ImageRow>(`/v1/places/${placeId}/images`, { method: 'POST', body: JSON.stringify(body) })

export const deleteImage = (imageId: number) =>
  request<{ id: number }>(`/v1/images/${imageId}`, { method: 'DELETE' })

export const reorderImages = (placeId: number, imageIds: number[]) =>
  request<{ image_ids: number[] }>(`/v1/places/${placeId}/images/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ image_ids: imageIds }),
  })

// ---------------------------------------------------------------- suggestions
//
// The one thing in this dashboard that nobody here wrote: messages from
// visitors. They are never published, so everything about them is read here or
// nowhere.

export const listSuggestions = (status?: SuggestionStatus) =>
  request<SuggestionRow[]>(`/v1/admin/suggestions${status ? `?status=${status}` : ''}`)

export const markSuggestion = (id: number, status: SuggestionStatus) =>
  request<SuggestionRow>(`/v1/suggestions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })

export const deleteSuggestion = (id: number) =>
  request<SuggestionRow>(`/v1/suggestions/${id}`, { method: 'DELETE' })

// -------------------------------------------------------------------- reviews
//
// Nothing a visitor writes is visible until one of these publishes it.

export const listReviews = (published?: boolean) =>
  request<ReviewRow[]>(
    `/v1/admin/reviews${published === undefined ? '' : `?published=${published}`}`,
  )

export const setReviewPublished = (id: number, isPublished: boolean) =>
  request<ReviewRow>(`/v1/reviews/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ is_published: isPublished }),
  })

export const deleteReview = (id: number) =>
  request<ReviewRow>(`/v1/reviews/${id}`, { method: 'DELETE' })
