import type { Context } from 'hono'
import { cached } from './cache.js'
import { internal } from './errors.js'
import { CACHE_CONTROL, list } from './response.js'
import { db } from '../db.js'
import type { AppBindings, Env } from '../types.js'

/**
 * A catalog endpoint: every active row of a small, ordered reference table,
 * resolved to one language and cached whole.
 *
 * Categories and amenities are both this. Neither paginates - a client that
 * has to page through them cannot render a place until it has them all - and
 * both are read on nearly every request, so both are cached for an hour and
 * purged by the write that changes them.
 */
export async function catalogList<T>(
  c: Context<AppBindings>,
  options: {
    table: string
    columns: string
    /** Per language: the names are resolved before caching. */
    cacheKey: string
    seconds?: number
    toItem: (env: Env, row: Record<string, unknown>, lang: string, fallback: string) => T
  },
) {
  const lang = c.get('lang')
  const fallback = c.env.DEFAULT_LANG
  const { table, columns, cacheKey, seconds = 3600, toItem } = options

  const payload = await cached(c.env, cacheKey, seconds, async () => {
    const { data, error } = await db(c.env)
      .from(table)
      .select(columns)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true })

    if (error) throw internal(error.message)

    // PostgREST types a select as possibly-error rows; the error is handled
    // above, so what is left is plain rows.
    const rows = (data ?? []) as unknown as Record<string, unknown>[]
    return {
      data: rows.map((row) => toItem(c.env, row, lang, fallback)),
      total: rows.length,
    }
  })

  return list(
    c,
    payload.data,
    { page: 1, limit: payload.total, total: payload.total, has_more: false },
    CACHE_CONTROL.categories,
  )
}
