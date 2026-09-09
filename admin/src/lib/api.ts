import 'server-only'
import type { Meta } from '@place-map/shared'
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
  is_active: boolean
  sort_order: number
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

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${env.apiUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': env.apiKey,
      ...init.headers,
    },
    // Admin screens must show what is actually stored, not a cached copy from
    // before the edit that brought the operator back to this page.
    cache: 'no-store',
  })

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

/** Builds a displayable URL from the stored CDN path. */
export function imageUrl(storagePath: string): string {
  return `${env.imagekitEndpoint}/${storagePath.replace(/^\/+/, '')}`
}

// --------------------------------------------------------------------- writes
// These return the raw row - an editor needs every translation, not one.

export const createCategory = (body: unknown) =>
  request<CategoryRow>('/v1/categories', { method: 'POST', body: JSON.stringify(body) })

export const updateCategory = (id: number, body: unknown) =>
  request<CategoryRow>(`/v1/categories/${id}`, { method: 'PATCH', body: JSON.stringify(body) })

export const deleteCategory = (id: number) =>
  request<CategoryRow>(`/v1/categories/${id}`, { method: 'DELETE' })

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
