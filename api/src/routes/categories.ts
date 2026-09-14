import { Hono } from 'hono'
import { PaginationSchema } from '@place-map/shared'
import { CATEGORY_COLUMNS, PLACE_COLUMNS, db } from '../db.js'
import { cacheKey, cached } from '../lib/cache.js'
import { internal, notFound } from '../lib/errors.js'
import { fetchPage } from '../lib/page.js'
import { CACHE_CONTROL, list, paginate } from '../lib/response.js'
import { toCategory, toPlaceSummary } from '../lib/serialize.js'
import { parseQuery } from '../lib/validate.js'
import type { AppBindings } from '../types.js'

export const categories = new Hono<AppBindings>()

// GET /v1/categories
categories.get('/', async (c) => {
  const lang = c.get('lang')
  const fallback = c.env.DEFAULT_LANG

  const payload = await cached(c.env, cacheKey.categories(lang), 3600, async () => {
    const { data, error } = await db(c.env)
      .from('categories')
      .select(CATEGORY_COLUMNS)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true })

    if (error) throw internal(error.message)

    const rows = data ?? []
    return {
      data: rows.map((row) => toCategory(row, lang, fallback)),
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

// GET /v1/categories/:slug/places?page=1&limit=20
categories.get('/:slug/places', async (c) => {
  const slug = c.req.param('slug')
  const { page, limit } = parseQuery(c, PaginationSchema)
  const lang = c.get('lang')
  const fallback = c.env.DEFAULT_LANG
  const supabase = db(c.env)

  // Resolved separately so an unknown slug is a 404 rather than an empty list -
  // clients need to tell "no such category" from "category has no places yet".
  const { data: category, error: categoryError } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (categoryError) throw internal(categoryError.message)
  if (!category) throw notFound(`Category '${slug}' not found`)

  const payload = await cached(
    c.env,
    cacheKey.categoryPlaces(slug, lang, page, limit),
    300,
    async () => {
      const { from, to } = paginate(page, limit, 0)
      const { data, error, count } = await fetchPage(
        (start, end) =>
          supabase
            .from('places')
            .select(PLACE_COLUMNS, { count: 'exact' })
            .eq('category_id', category.id)
            .eq('is_active', true)
            .order('sort_order', { ascending: true })
            .order('id', { ascending: true })
            .range(start, end),
        from,
        to,
      )

      if (error) throw internal(error.message)

      return {
        rows: (data ?? []).map((row) => toPlaceSummary(c.env, row, lang, fallback)),
        total: count ?? 0,
      }
    },
  )

  const { meta } = paginate(page, limit, payload.total)
  return list(c, payload.rows, meta)
})
