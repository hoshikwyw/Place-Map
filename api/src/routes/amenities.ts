import { Hono } from 'hono'
import { AMENITY_COLUMNS } from '../db.js'
import { cacheKey } from '../lib/cache.js'
import { catalogList } from '../lib/catalog.js'
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
amenities.get('/', (c) =>
  catalogList(c, {
    table: 'amenities',
    columns: AMENITY_COLUMNS,
    cacheKey: cacheKey.amenities(c.get('lang')),
    toItem: toAmenity,
  }),
)
