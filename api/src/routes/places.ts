import { Hono } from 'hono'
import { PaginationSchema, PlaceFiltersSchema, PlaceIdsSchema } from '@place-map/shared'
import { PLACE_COLUMNS, db } from '../db.js'
import { cacheKey, cached } from '../lib/cache.js'
import { internal, notFound } from '../lib/errors.js'
import { applyPlaceFilters, filterKey } from '../lib/filters.js'
import { fetchPage } from '../lib/page.js'
import { CACHE_CONTROL, item, list, paginate } from '../lib/response.js'
import { imageUrl, toPlace, toPlaceSummary } from '../lib/serialize.js'
import { parseQuery } from '../lib/validate.js'
import type { AppBindings } from '../types.js'

export const places = new Hono<AppBindings>()

// GET /v1/places?page=1&limit=20
//
// Every active place across all categories: the unfiltered browse list the
// website's home page shows before a visitor picks a category or searches.
places.get('/', async (c) => {
  const { page, limit } = parseQuery(c, PaginationSchema)
  const filters = parseQuery(c, PlaceFiltersSchema)
  const { ids } = parseQuery(c, PlaceIdsSchema)
  const lang = c.get('lang')
  const fallback = c.env.DEFAULT_LANG

  // A named set of places - what a saved list asks for. Not cached in KV: the
  // key space is every combination of ids anyone has ever saved, and each
  // request is for one reader's own list.
  if (ids) {
    if (ids.length === 0) {
      return list(c, [], { page: 1, limit: 0, total: 0, has_more: false }, CACHE_CONTROL.search)
    }

    const { data, error } = await db(c.env)
      .from('places')
      .select(PLACE_COLUMNS)
      .in('id', ids)
      .eq('is_active', true)
      .eq('category.is_active', true)
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true })

    if (error) throw internal(error.message)

    // Places that were hidden or deleted since they were saved simply are not
    // here; the client prunes them from its own list.
    const found = (data ?? []).map((row) => toPlaceSummary(c.env, row, lang, fallback))
    return list(
      c,
      found,
      { page: 1, limit: found.length, total: found.length, has_more: false },
      CACHE_CONTROL.search,
    )
  }

  // The filters are part of the key, so a narrowed list can never be handed to
  // someone who asked for the whole one.
  const key = cacheKey.allPlaces(lang, page, limit) + ':' + filterKey(filters)

  const payload = await cached(c.env, key, 300, async () => {
    const { from, to } = paginate(page, limit, 0)
    const supabase = db(c.env)
    const { data, error, count } = await fetchPage(
      (start, end) =>
        applyPlaceFilters(
          supabase
            .from('places')
            .select(PLACE_COLUMNS, { count: 'exact' })
            .eq('is_active', true)
            // A hidden category hides its places too - otherwise this list
            // would show places the category pages deliberately do not.
            .eq('category.is_active', true),
          filters,
        )
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
  })

  const { meta } = paginate(page, limit, payload.total)
  return list(c, payload.rows, meta)
})

const isNumericId = (value: string) => /^\d+$/.test(value)

/**
 * Digits mean an id, but only while Number() can hold them exactly. Anything
 * longer rounds, and Postgres rejects the result as out of range for bigint -
 * a 500 for what is simply a place that does not exist.
 */
const isImpossibleId = (value: string) => isNumericId(value) && !Number.isSafeInteger(Number(value))

// GET /v1/places/:idOrSlug
//
// Accepts either. The bot passes numeric ids (callback_data is capped at 64
// bytes); the web app uses slugs so its URLs are readable and indexable.
places.get('/:idOrSlug', async (c) => {
  const idOrSlug = c.req.param('idOrSlug')
  const lang = c.get('lang')
  const fallback = c.env.DEFAULT_LANG

  if (isImpossibleId(idOrSlug)) throw notFound(`Place '${idOrSlug}' not found`)

  const place = await cached(c.env, cacheKey.place(idOrSlug, lang), 300, async () => {
    const query = db(c.env).from('places').select(PLACE_COLUMNS).eq('is_active', true)

    const { data, error } = await (
      isNumericId(idOrSlug) ? query.eq('id', Number(idOrSlug)) : query.eq('slug', idOrSlug)
    ).maybeSingle()

    if (error) throw internal(error.message)
    if (!data) throw notFound(`Place '${idOrSlug}' not found`)

    return toPlace(c.env, data, lang, fallback)
  })

  return item(c, place)
})

// GET /v1/places/:idOrSlug/images
places.get('/:idOrSlug/images', async (c) => {
  const idOrSlug = c.req.param('idOrSlug')
  if (isImpossibleId(idOrSlug)) throw notFound(`Place '${idOrSlug}' not found`)
  const supabase = db(c.env)

  const placeQuery = supabase.from('places').select('id').eq('is_active', true)
  const { data: place, error: placeError } = await (
    isNumericId(idOrSlug) ? placeQuery.eq('id', Number(idOrSlug)) : placeQuery.eq('slug', idOrSlug)
  ).maybeSingle()

  if (placeError) throw internal(placeError.message)
  if (!place) throw notFound(`Place '${idOrSlug}' not found`)

  const images = await cached(c.env, cacheKey.placeImages(place.id), 300, async () => {
    const { data, error } = await supabase
      .from('place_images')
      .select('storage_path, width, height, sort_order')
      .eq('place_id', place.id)
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true })

    if (error) throw internal(error.message)

    return (data ?? []).map((row) => ({
      url: imageUrl(c.env, row.storage_path),
      width: row.width ?? null,
      height: row.height ?? null,
    }))
  })

  return list(c, images, {
    page: 1,
    limit: images.length,
    total: images.length,
    has_more: false,
  })
})

// GET /v1/places/:idOrSlug/reviews
//
// The published reviews for one place, newest first. Unpublished ones are
// invisible here and counted nowhere - that is the whole moderation model, and
// it lives in this `.eq('is_published', true)` and in the trigger that
// computes the place's rating from the same set.
//
// Capped rather than paginated: a place in this directory will not have enough
// reviews for a second page, and a pager is a control to build the day it
// does. The newest are the ones worth reading.
const REVIEWS_SHOWN = 50

places.get('/:idOrSlug/reviews', async (c) => {
  const idOrSlug = c.req.param('idOrSlug')
  if (isImpossibleId(idOrSlug)) throw notFound(`Place '${idOrSlug}' not found`)
  const supabase = db(c.env)

  const placeQuery = supabase.from('places').select('id').eq('is_active', true)
  const { data: place, error: placeError } = await (
    isNumericId(idOrSlug) ? placeQuery.eq('id', Number(idOrSlug)) : placeQuery.eq('slug', idOrSlug)
  ).maybeSingle()

  if (placeError) throw internal(placeError.message)
  if (!place) throw notFound(`Place '${idOrSlug}' not found`)

  const reviews = await cached(c.env, cacheKey.placeReviews(place.id), 300, async () => {
    const { data, error } = await supabase
      .from('reviews')
      .select('id, rating, comment, author, created_at')
      .eq('place_id', place.id)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(REVIEWS_SHOWN)

    if (error) throw internal(error.message)

    return (data ?? []).map((row) => ({
      id: row.id,
      rating: row.rating,
      comment: row.comment ?? null,
      author: row.author ?? null,
      created_at: row.created_at,
    }))
  })

  return list(c, reviews, {
    page: 1,
    limit: reviews.length,
    total: reviews.length,
    has_more: false,
  })
})
