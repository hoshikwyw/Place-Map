import type { Context } from 'hono'
import type { ItemResponse, ListResponse, Meta } from '@place-map/shared'
import type { AppBindings } from '../types.js'

/**
 * Cache-Control is what actually keeps this Worker under 100K requests/day -
 * Cloudflare's edge answers repeat requests without ever invoking the script.
 * Values match the plan: categories change almost never, search barely caches.
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
