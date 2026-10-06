import { Hono } from 'hono'
import { AMENITY_COLUMNS, db } from '../db.js'
import { cacheKey, cached } from '../lib/cache.js'
import { internal } from '../lib/errors.js'
import { CACHE_CONTROL, list } from '../lib/response.js'
import { toAmenity } from '../lib/serialize.js'
import type { AppBindings } from '../types.js'

export const amenities = new Hono<AppBindings>()

/**
 * GET /v1/amenities
 *
 * The catalog of labels. A place carries slugs, not names, so a client fetches
 * this once and resolves them - the same shape as categories, and the reason a
 * place read needs no extra join.
 *
 * There is no pagination: a directory has a handful of these, and a client
 * that has to page through them cannot render a place until it has them all.
 */
amenities.get('/', async (c) => {
  const lang = c.get('lang')
  const fallback = c.env.DEFAULT_LANG

  const payload = await cached(c.env, cacheKey.amenities(lang), 3600, async () => {
    const { data, error } = await db(c.env)
      .from('amenities')
      .select(AMENITY_COLUMNS)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true })

    if (error) throw internal(error.message)

    const rows = data ?? []
    return {
      data: rows.map((row) => toAmenity(c.env, row, lang, fallback)),
      total: rows.length,
    }
  })

  return list(
    c,
    payload.data,
    { page: 1, limit: payload.total, total: payload.total, has_more: false },
    CACHE_CONTROL.categories,
  )
})
