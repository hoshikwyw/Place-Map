import type { Category, ItemResponse, ListResponse, Place, PlaceSummary } from '@place-map/shared'
import type { ExecutionContext } from 'hono'
import type { Env } from '../types.js'

/**
 * The bot reads through the same `/v1` API as the web and native apps, so the
 * query logic, the language resolution and the response shape exist once.
 *
 * It dispatches into the Hono app in-process rather than over the network. A
 * Worker fetching its own public URL is billed as a second request, and at
 * 100K/day the bot would spend the quota twice for identical data. This is the
 * same code path a real HTTP request takes - routing, middleware, KV cache -
 * minus the round trip.
 */

type Dispatch = (request: Request, env: Env, ctx: ExecutionContext) => Response | Promise<Response>

let dispatch: Dispatch | null = null

/** Called once from index.ts, after the app and its routes are constructed. */
export function setInternalDispatcher(fn: Dispatch): void {
  dispatch = fn
}

async function get<T>(env: Env, ctx: ExecutionContext, path: string, lang: string): Promise<T> {
  if (!dispatch) throw new Error('Internal API dispatcher was never set')

  const request = new Request(`https://internal${path}`, {
    headers: { 'Accept-Language': lang },
  })
  const response = await dispatch(request, env, ctx)
  const body = await response.json()

  if (!response.ok) {
    const error = body as { error?: { code?: string; message?: string } }
    throw new Error(`API ${path} -> ${response.status} ${error.error?.message ?? 'failed'}`)
  }

  return body as T
}

export async function fetchCategories(
  env: Env,
  ctx: ExecutionContext,
  lang: string,
): Promise<Category[]> {
  const body = await get<ListResponse<Category>>(env, ctx, '/v1/categories', lang)
  return body.data
}

export async function fetchCategoryPlaces(
  env: Env,
  ctx: ExecutionContext,
  lang: string,
  slug: string,
  page: number,
  limit: number,
): Promise<ListResponse<PlaceSummary>> {
  return get<ListResponse<PlaceSummary>>(
    env,
    ctx,
    `/v1/categories/${encodeURIComponent(slug)}/places?page=${page}&limit=${limit}`,
    lang,
  )
}

export async function fetchPlace(
  env: Env,
  ctx: ExecutionContext,
  lang: string,
  id: number,
): Promise<Place> {
  const body = await get<ItemResponse<Place>>(env, ctx, `/v1/places/${id}`, lang)
  return body.data
}

export async function searchPlaces(
  env: Env,
  ctx: ExecutionContext,
  lang: string,
  query: string,
  limit: number,
): Promise<ListResponse<PlaceSummary>> {
  return get<ListResponse<PlaceSummary>>(
    env,
    ctx,
    `/v1/search?q=${encodeURIComponent(query)}&limit=${limit}`,
    lang,
  )
}
