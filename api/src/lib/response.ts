import type { Context } from 'hono'
import type { ItemResponse, ListResponse, Meta } from '@place-map/shared'
import type { AppBindings } from '../types.js'

/**
 * A Worker's own responses are not put in Cloudflare's cache automatically, so
 * these headers govern browsers, the native app's HTTP cache and any CDN in
 * front of the API - not the Worker itself. Every request still runs the
 * script; what spares the database is the KV layer behind it.
 *
 * Values match the plan: categories change almost never, search barely caches.
 * Anything longer than a few minutes would outlive an admin edit, since these
 * copies live in clients and cannot be purged from here.
 */
export const CACHE_CONTROL = {
  categories: 'public, max-age=3600, stale-while-revalidate=86400',
  list: 'public, max-age=300, stale-while-revalidate=3600',
  item: 'public, max-age=300, stale-while-revalidate=3600',
  search: 'public, max-age=60, stale-while-revalidate=300',
  none: 'no-store',
} as const

type Ctx = Context<AppBindings>

export function item<T>(c: Ctx, data: T, cacheControl: string = CACHE_CONTROL.item) {
  c.header('Cache-Control', cacheControl)
  return c.json<ItemResponse<T>>({ data })
}

export function list<T>(
  c: Ctx,
  data: T[],
  meta: Meta,
  cacheControl: string = CACHE_CONTROL.list,
) {
  c.header('Cache-Control', cacheControl)
  return c.json<ListResponse<T>>({ data, meta })
}

/** Builds the pagination block and the Postgres range for a page. */
export function paginate(page: number, limit: number, total: number) {
  const from = (page - 1) * limit
  return {
    from,
    to: from + limit - 1,
    meta: { page, limit, total, has_more: from + limit < total } satisfies Meta,
  }
}
