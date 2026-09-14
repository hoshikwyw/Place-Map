import { Hono } from 'hono'
import { SearchQuerySchema } from '@place-map/shared'
import { PLACE_COLUMNS, db } from '../db.js'
import { internal, notFound } from '../lib/errors.js'
import { fetchPage } from '../lib/page.js'
import { CACHE_CONTROL, list, paginate } from '../lib/response.js'
import { toPlaceSummary } from '../lib/serialize.js'
import { parseQuery } from '../lib/validate.js'
import type { AppBindings } from '../types.js'

export const search = new Hono<AppBindings>()

/** PostgREST treats these as wildcards/separators inside a filter value. */
const escapeLike = (value: string) => value.replace(/[%_,()*\\]/g, '')

// GET /v1/search?q=...&category=...&page=1&limit=20
//
// Matches `search_text` (migration 0002): every locale's name and description
// plus the address, flattened into one column. So "kafe" finds the Uzbek name
// and "cafe" finds the English one without the client choosing a language.
//
// Not cached in KV - the key space is unbounded and mostly one-shot queries.
// The 60s edge cache absorbs the repeats that matter.
search.get('/', async (c) => {
  const { q, category, page, limit } = parseQuery(c, SearchQuerySchema)
  const lang = c.get('lang')
  const fallback = c.env.DEFAULT_LANG
  const supabase = db(c.env)

  const term = escapeLike(q)
  if (!term) {
    return list(c, [], { page, limit, total: 0, has_more: false }, CACHE_CONTROL.search)
  }

  let categoryId: number | undefined

  if (category) {
    const { data: found, error: categoryError } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', category)
      .eq('is_active', true)
      .maybeSingle()

    if (categoryError) throw internal(categoryError.message)
    if (!found) throw notFound(`Category '${category}' not found`)

    categoryId = found.id
  }

  const { from, to } = paginate(page, limit, 0)
  const { data, error, count } = await fetchPage(
    (start, end) => {
      let query = supabase
        .from('places')
        .select(PLACE_COLUMNS, { count: 'exact' })
        .eq('is_active', true)
        .ilike('search_text', `%${term}%`)
      if (categoryId !== undefined) query = query.eq('category_id', categoryId)
      return query.order('sort_order', { ascending: true }).order('id', { ascending: true }).range(start, end)
    },
    from,
    to,
  )

  if (error) throw internal(error.message)

  const rows = (data ?? []).map((row) => toPlaceSummary(c.env, row, lang, fallback))
  const { meta } = paginate(page, limit, count ?? 0)

  return list(c, rows, meta, CACHE_CONTROL.search)
})
