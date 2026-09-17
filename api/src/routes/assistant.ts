import { Hono } from 'hono'
import {
  ASSISTANT_RADIUS_KM_DEFAULT,
  ASSISTANT_RADIUS_KM_MAX,
  AssistantQuerySchema,
  isOpenAt,
  type AssistantResult,
  type NearbyPlace,
} from '@place-map/shared'
import { isEmptyIntent, parseMessage } from '../assistant/parse.js'
import { reply, type ReplyInput, type ReplyKind } from '../assistant/reply.js'
import { CATEGORY_COLUMNS, PLACE_COLUMNS, db } from '../db.js'
import { cacheKey, cached } from '../lib/cache.js'
import { internal } from '../lib/errors.js'
import { boundingBox, distanceMeters, type Point } from '../lib/geo.js'
import { escapeLike } from '../lib/like.js'
import { CACHE_CONTROL, item } from '../lib/response.js'
import { toCategory, toPlaceSummary } from '../lib/serialize.js'
import { parseQuery } from '../lib/validate.js'
import type { AppBindings, Env } from '../types.js'

export const assistant = new Hono<AppBindings>()

/**
 * Rows fetched per query before distance and "open now" are applied in the
 * Worker. The site holds a few hundred places; near-me queries are also cut to
 * a bounding box first, so this is rarely reached.
 */
const CANDIDATE_LIMIT = 200
const DEFAULT_TIME_ZONE = 'Asia/Yangon'

type Row = Record<string, unknown>

interface CategoryRow {
  id: number
  slug: string
  name: unknown
  icon: string | null
}

/** Every active category with its names in all languages - the parser matches any of them. */
function loadCategories(env: Env): Promise<CategoryRow[]> {
  return cached(env, cacheKey.assistantCategories, 300, async () => {
    const { data, error } = await db(env)
      .from('categories')
      .select(CATEGORY_COLUMNS)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true })

    if (error) throw internal(error.message)
    return (data ?? []) as CategoryRow[]
  })
}

const localizedValues = (value: unknown): string[] =>
  value && typeof value === 'object'
    ? Object.values(value).filter((text): text is string => typeof text === 'string')
    : typeof value === 'string'
      ? [value]
      : []

interface Filters {
  categoryId: number | null
  keywords: string[]
  location: Point | null
  /** Only places within this distance. Null: any distance. */
  radiusKm: number | null
  openNow: boolean
  limit: number
}

async function findPlaces(env: Env, lang: string, filters: Filters): Promise<NearbyPlace[]> {
  let query = db(env)
    .from('places')
    .select(PLACE_COLUMNS)
    .eq('is_active', true)
    .eq('category.is_active', true)

  if (filters.categoryId !== null) query = query.eq('category_id', filters.categoryId)

  for (const keyword of filters.keywords) {
    const term = escapeLike(keyword)
    if (term) query = query.ilike('search_text', `%${term}%`)
  }

  if (filters.location && filters.radiusKm !== null) {
    const box = boundingBox(filters.location, filters.radiusKm)
    query = query
      .gte('lat', box.minLat)
      .lte('lat', box.maxLat)
      .gte('lng', box.minLng)
      .lte('lng', box.maxLng)
  }

  const { data, error } = await query
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true })
    .limit(CANDIDATE_LIMIT)

  if (error) throw internal(error.message)

  const now = new Date()
  const timeZone = env.TIME_ZONE || DEFAULT_TIME_ZONE
  const { location, radiusKm } = filters

  const places = ((data ?? []) as Row[])
    .map((row): NearbyPlace => {
      const place = toPlaceSummary(env, row, lang, env.DEFAULT_LANG)
      const distance = location && place.location ? Math.round(distanceMeters(location, place.location)) : null
      return { ...place, distance_m: distance }
    })
    .filter((place) => !filters.openNow || isOpenAt(place.opening_hours, now, timeZone)?.open === true)
    // The bounding box is a square around the circle; this trims its corners.
    .filter((place) => radiusKm === null || (place.distance_m !== null && place.distance_m <= radiusKm * 1000))

  if (location) {
    // Places without coordinates go last, in their usual order.
    places.sort((a, b) => {
      if (a.distance_m === null || b.distance_m === null) {
        return a.distance_m === b.distance_m ? 0 : a.distance_m === null ? 1 : -1
      }
      return a.distance_m - b.distance_m
    })
  }

  return places.slice(0, filters.limit)
}

// GET /v1/assistant?q=cafe near me&lat=16.77&lng=96.16
//
// A GET, not a POST, so it sits under the same public read-only CORS policy
// and API-key guard as every other /v1 read. The location is not stored or
// logged, and the response is never cached - it is specific to where the
// person asking is standing.
assistant.get('/', async (c) => {
  const { q, lat, lng, limit } = parseQuery(c, AssistantQuerySchema)
  const lang = c.get('lang')
  const location = lat !== undefined && lng !== undefined ? { lat, lng } : null

  const categories = await loadCategories(c.env)
  const intent = parseMessage(
    q,
    categories.map((row) => ({ id: row.id, slug: row.slug, names: localizedValues(row.name) })),
  )

  const categoryRow = categories.find((row) => row.id === intent.categoryId)
  const category = categoryRow ? toCategory(categoryRow as unknown as Row, lang, c.env.DEFAULT_LANG) : null
  const radiusKm = intent.radiusKm ?? ASSISTANT_RADIUS_KM_DEFAULT

  const understood: AssistantResult['understood'] = {
    category,
    near_me: intent.nearMe,
    radius_km: intent.nearMe ? radiusKm : null,
    open_now: intent.openNow,
    keywords: intent.keywords,
  }

  const respond = (kind: ReplyKind, places: NearbyPlace[], extra: Partial<ReplyInput> = {}) =>
    item<AssistantResult>(
      c,
      {
        reply: reply(lang, {
          kind,
          category: category?.name ?? null,
          keywords: intent.keywords,
          openNow: intent.openNow,
          nearMe: intent.nearMe,
          sortedByDistance: location !== null,
          radiusKm,
          widenedToKm: null,
          droppedKeywords: [],
          ...extra,
        }),
        needs_location: kind === 'needs_location',
        understood,
        places,
      },
      CACHE_CONTROL.none,
    )

  if (isEmptyIntent(intent)) return respond('help', [])
  if (intent.nearMe && !location) return respond('needs_location', [])

  const filters: Filters = {
    categoryId: intent.categoryId,
    keywords: intent.keywords,
    location,
    radiusKm: intent.nearMe ? radiusKm : null,
    openNow: intent.openNow,
    limit,
  }

  let places = await findPlaces(c.env, lang, filters)

  // Leftover words are the least reliable part of a message ("cafe with wifi
  // near me"). When they are what excluded everything, answer the rest of it.
  let droppedKeywords: string[] = []
  const understoodMore = intent.categoryId !== null || intent.nearMe || intent.openNow
  if (!places.length && filters.keywords.length && understoodMore) {
    droppedKeywords = filters.keywords
    filters.keywords = []
    places = await findPlaces(c.env, lang, filters)
  }

  // Nothing within the radius: better the closest few than an empty answer.
  let widenedToKm: number | null = null
  if (!places.length && filters.radiusKm !== null && filters.radiusKm < ASSISTANT_RADIUS_KM_MAX) {
    widenedToKm = ASSISTANT_RADIUS_KM_MAX
    places = await findPlaces(c.env, lang, { ...filters, radiusKm: widenedToKm })
  }

  if (!places.length) return respond('none', [], { widenedToKm })

  return respond('found', places, { keywords: filters.keywords, droppedKeywords, widenedToKm })
})
