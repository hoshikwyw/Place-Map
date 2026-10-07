import { Hono } from 'hono'
import type { z } from 'zod'
import {
  CreateAmenitySchema,
  CreateCategorySchema,
  CreatePlaceImageSchema,
  CreatePlaceSchema,
  ReorderImagesSchema,
  UpdateAmenitySchema,
  UpdateCategorySchema,
  UpdatePlaceSchema,
} from '@place-map/shared'
import { db } from '../db.js'
import { requireApiKey } from '../lib/auth.js'
import { ApiError, badRequest, internal, notFound } from '../lib/errors.js'
import { fetchPage } from '../lib/page.js'
import { purgeAmenities, purgeCategories, purgePlace } from '../lib/purge.js'
import { CACHE_CONTROL } from '../lib/response.js'
import type { AppBindings, Env } from '../types.js'

/**
 * The admin API: every write, plus the reads that only an editor may see.
 *
 * Every route in this file is behind `requireApiKey`, applied to the whole
 * sub-app below rather than route by route - so a new endpoint added here is
 * protected by default, and forgetting the guard is not possible.
 *
 * Everything here returns the **raw database row**, jsonb and all, unlike the
 * public API which flattens `name` to one language and hides inactive rows. An
 * editor needs every translation at once and needs to see what is unpublished;
 * a reader needs exactly one language and only what is live.
 */
export const writes = new Hono<AppBindings>()

writes.use('*', async (c, next) => {
  // This sub-app is mounted on all of /v1, so a GET that no public read route
  // matched falls through to here too. That is an unknown path, not an admin
  // request - answering 401 would claim it exists and needs a key. Let it
  // reach the 404. Every admin GET lives under /v1/admin/, and every write is
  // POST, PATCH or DELETE, so all of those still pass through the guard.
  const isRead = c.req.method === 'GET' || c.req.method === 'HEAD'
  if (isRead && !c.req.path.startsWith('/v1/admin/')) return next()
  return requireApiKey(c, next)
})

// ------------------------------------------------------------------- helpers

async function parseBody<T extends z.ZodType>(
  c: { req: { json: () => Promise<unknown> } },
  schema: T,
): Promise<z.infer<T>> {
  let raw: unknown
  try {
    raw = await c.req.json()
  } catch {
    throw badRequest('Body must be valid JSON')
  }

  const result = schema.safeParse(raw)
  if (!result.success) {
    const issue = result.error.issues[0]
    const where = issue?.path.length ? `${issue.path.join('.')}: ` : ''
    throw badRequest(`${where}${issue?.message ?? 'Invalid body'}`)
  }
  return result.data
}

function parseId(value: string | undefined): number {
  const id = Number(value)
  // isSafeInteger, not isInteger: "99999999999999999999" is an integer to
  // Number() but rounds, and Postgres then rejects it as out of range for
  // bigint - a 500 for what is really bad input.
  if (!Number.isSafeInteger(id) || id <= 0) throw badRequest('id must be a positive integer')
  return id
}

interface PgError {
  code?: string
  message: string
  details?: string | null
}

/**
 * Turns a Postgres constraint failure into an error the dashboard can show a
 * human, instead of a 500 with a schema dump in it.
 */
function fromPostgres(error: PgError, context: string): ApiError {
  switch (error.code) {
    case '23505':
      return badRequest('That slug is already taken')
    case '23503':
      // Either the referenced row is missing, or something still points here.
      return badRequest(
        context === 'delete'
          ? 'Still referenced by other rows - move or delete those first'
          : 'That category does not exist',
      )
    case '23502':
      return badRequest('A required field was missing')
    case '22P02':
      return badRequest('A field had the wrong type')
    default:
      console.error(`db error during ${context}`, error)
      return internal()
  }
}

/** Writes must never be cached, by anyone, anywhere. */
function noStore(c: { header: (name: string, value: string) => void }) {
  c.header('Cache-Control', CACHE_CONTROL.none)
}

// --------------------------------------------------------------- admin reads
// Namespaced under /admin so they cannot shadow the public GET routes, which
// are mounted on the same /v1 prefix.

writes.get('/admin/categories', async (c) => {
  const { data, error } = await db(c.env)
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true })

  if (error) throw fromPostgres(error, 'list categories')
  noStore(c)
  return c.json({ data: data ?? [] })
})

writes.get('/admin/amenities', async (c) => {
  const { data, error } = await db(c.env)
    .from('amenities')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true })

  if (error) throw fromPostgres(error, 'list amenities')
  noStore(c)
  return c.json({ data: data ?? [] })
})

writes.get('/admin/places', async (c) => {
  const page = Math.max(1, Number(c.req.query('page') ?? 1))
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') ?? 50)))
  const categoryId = c.req.query('category_id')
  const search = c.req.query('q')?.trim()

  const supabase = db(c.env)
  const build = (start: number, end: number) => {
    // The photos come along so the dashboard list can show a thumbnail; it
    // takes the first by sort_order, the same one the public card uses.
    let query = supabase
      .from('places')
      .select('*, images:place_images(storage_path, sort_order)', { count: 'exact' })
    if (categoryId) query = query.eq('category_id', Number(categoryId))
    // Same generated column the public search uses, so the admin list and the
    // public results agree about what a query matches.
    if (search) query = query.ilike('search_text', `%${search.replace(/[%_,()*\\]/g, '')}%`)
    return query.order('sort_order', { ascending: true }).order('id', { ascending: true }).range(start, end)
  }

  const from = (page - 1) * limit
  const { data, error, count } = await fetchPage(build, from, from + limit - 1)

  if (error) throw fromPostgres(error, 'list places')

  const total = count ?? 0
  noStore(c)
  return c.json({
    data: data ?? [],
    meta: { page, limit, total, has_more: from + limit < total },
  })
})

writes.get('/admin/places/:id', async (c) => {
  const id = parseId(c.req.param('id'))

  const { data, error } = await db(c.env).from('places').select('*').eq('id', id).maybeSingle()
  if (error) throw fromPostgres(error, 'read place')
  if (!data) throw notFound(`Place ${id} not found`)

  noStore(c)
  return c.json({ data })
})

writes.get('/admin/places/:id/images', async (c) => {
  const id = parseId(c.req.param('id'))

  const { data, error } = await db(c.env)
    .from('place_images')
    .select('*')
    .eq('place_id', id)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true })

  if (error) throw fromPostgres(error, 'list images')
  noStore(c)
  return c.json({ data: data ?? [] })
})

// ------------------------------------------------- catalogs: amenities, categories
//
// Two tables with the same shape - a slug, a localized name, an icon, a sort
// order - and therefore the same three writes. Registered from one place so a
// fix to the error handling or the cache purge cannot land on one and miss the
// other. Places are not here: that one purges by slug as well as id, so it is
// written out below.

interface Catalog {
  /** Mounted under /v1, so '/amenities' becomes POST /v1/amenities. */
  path: string
  table: string
  /** Used in error messages: "create amenity", "Amenity 4 not found". */
  noun: string
  create: z.ZodType<object>
  update: z.ZodType<object>
  purge: (env: Env) => Promise<void>
}

function catalogWrites({ path, table, noun, create, update, purge }: Catalog) {
  const Noun = noun.charAt(0).toUpperCase() + noun.slice(1)

  writes.post(path, async (c) => {
    const body = await parseBody(c, create)

    const { data, error } = await db(c.env).from(table).insert(body).select().single()
    if (error) throw fromPostgres(error, `create ${noun}`)

    await purge(c.env)
    noStore(c)
    return c.json({ data }, 201)
  })

  writes.patch(`${path}/:id`, async (c) => {
    const id = parseId(c.req.param('id'))
    const body = await parseBody(c, update)

    const { data, error } = await db(c.env)
      .from(table)
      .update(body)
      .eq('id', id)
      .select()
      .maybeSingle()

    if (error) throw fromPostgres(error, `update ${noun}`)
    if (!data) throw notFound(`${Noun} ${id} not found`)

    await purge(c.env)
    noStore(c)
    return c.json({ data })
  })

  writes.delete(`${path}/:id`, async (c) => {
    const id = parseId(c.req.param('id'))

    const { data, error } = await db(c.env)
      .from(table)
      .delete()
      .eq('id', id)
      .select()
      .maybeSingle()

    if (error) throw fromPostgres(error, `delete ${noun}`)
    if (!data) throw notFound(`${Noun} ${id} not found`)

    await purge(c.env)
    noStore(c)
    return c.json({ data })
  })
}

// Deleting these two behaves differently, and the difference is the database's,
// not this code's. A category is refused by `on delete restrict` while it still
// holds places, which arrives here as a 400. Nothing refers to an amenity - a
// place stores the slug as text - so that delete always succeeds and the slug
// simply stops resolving.
catalogWrites({
  path: '/amenities',
  table: 'amenities',
  noun: 'amenity',
  create: CreateAmenitySchema,
  update: UpdateAmenitySchema,
  purge: purgeAmenities,
})

catalogWrites({
  path: '/categories',
  table: 'categories',
  noun: 'category',
  create: CreateCategorySchema,
  update: UpdateCategorySchema,
  purge: purgeCategories,
})

// -------------------------------------------------------------------- places

writes.post('/places', async (c) => {
  const body = await parseBody(c, CreatePlaceSchema)

  const { data, error } = await db(c.env).from('places').insert(body).select().single()
  if (error) throw fromPostgres(error, 'create place')

  await purgePlace(c.env, data.id, data.slug)
  noStore(c)
  return c.json({ data }, 201)
})

writes.patch('/places/:id', async (c) => {
  const id = parseId(c.req.param('id'))
  const body = await parseBody(c, UpdatePlaceSchema)
  const supabase = db(c.env)

  // The old slug is cached under its own key, so it has to be purged too - a
  // rename would otherwise leave the previous URL serving the previous data.
  const { data: before } = await supabase.from('places').select('slug').eq('id', id).maybeSingle()

  const { data, error } = await supabase
    .from('places')
    .update(body)
    .eq('id', id)
    .select()
    .maybeSingle()

  if (error) throw fromPostgres(error, 'update place')
  if (!data) throw notFound(`Place ${id} not found`)

  await purgePlace(c.env, id, data.slug)
  if (before?.slug && before.slug !== data.slug) await purgePlace(c.env, id, before.slug)

  noStore(c)
  return c.json({ data })
})

writes.delete('/places/:id', async (c) => {
  const id = parseId(c.req.param('id'))

  const { data, error } = await db(c.env)
    .from('places')
    .delete()
    .eq('id', id)
    .select()
    .maybeSingle()

  if (error) throw fromPostgres(error, 'delete')
  if (!data) throw notFound(`Place ${id} not found`)

  // place_images rows cascade, but the files stay on ImageKit. Deleting them
  // there is a separate, deliberate step - an accidental delete here should be
  // recoverable from the nightly dump plus the untouched CDN.
  await purgePlace(c.env, id, data.slug)
  noStore(c)
  return c.json({ data })
})

// -------------------------------------------------------------------- images

/**
 * Records an image already uploaded to the CDN. The API never receives file
 * bytes: resizing costs far more than the 10 ms CPU budget, so the upload is
 * done by the CLI (Part 3) or by the dashboard's own server side.
 */
writes.post('/places/:id/images', async (c) => {
  const placeId = parseId(c.req.param('id'))
  const body = await parseBody(c, CreatePlaceImageSchema)
  const supabase = db(c.env)

  const { data: place } = await supabase.from('places').select('slug').eq('id', placeId).maybeSingle()
  if (!place) throw notFound(`Place ${placeId} not found`)

  const { data, error } = await supabase
    .from('place_images')
    .insert({ ...body, place_id: placeId })
    .select()
    .single()

  if (error) throw fromPostgres(error, 'create image')

  await purgePlace(c.env, placeId, place.slug)
  noStore(c)
  return c.json({ data }, 201)
})

writes.delete('/images/:imageId', async (c) => {
  const imageId = parseId(c.req.param('imageId'))

  const { data, error } = await db(c.env)
    .from('place_images')
    .delete()
    .eq('id', imageId)
    .select('id, place_id')
    .maybeSingle()

  if (error) throw fromPostgres(error, 'delete')
  if (!data) throw notFound(`Image ${imageId} not found`)

  await purgePlace(c.env, data.place_id)
  noStore(c)
  return c.json({ data })
})

/** Whole-list reorder - simpler to reason about than per-image sort values. */
writes.patch('/places/:id/images/reorder', async (c) => {
  const placeId = parseId(c.req.param('id'))
  const { image_ids } = await parseBody(c, ReorderImagesSchema)
  const supabase = db(c.env)

  const { data: owned, error: readError } = await supabase
    .from('place_images')
    .select('id')
    .eq('place_id', placeId)

  if (readError) throw fromPostgres(readError, 'reorder')
  if (!owned || owned.length === 0) throw notFound(`Place ${placeId} has no images`)

  // Refuse a partial or foreign list outright. Applying it would leave some
  // images with stale sort values and no way to tell from the result.
  const ownedIds = new Set(owned.map((row) => row.id as number))
  const sameSize = ownedIds.size === image_ids.length
  const allOwned = image_ids.every((id) => ownedIds.has(id))
  if (!sameSize || !allOwned) {
    throw badRequest('image_ids must list exactly the images belonging to this place')
  }

  for (const [index, id] of image_ids.entries()) {
    const { error } = await supabase
      .from('place_images')
      .update({ sort_order: (index + 1) * 10 })
      .eq('id', id)
    if (error) throw fromPostgres(error, 'reorder')
  }

  const { data: place } = await supabase.from('places').select('slug').eq('id', placeId).maybeSingle()
  await purgePlace(c.env, placeId, place?.slug)

  noStore(c)
  return c.json({ data: { image_ids } })
})
