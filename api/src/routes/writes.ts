import { Hono } from 'hono'
import type { z } from 'zod'
import {
  CreateCategorySchema,
  CreatePlaceImageSchema,
  CreatePlaceSchema,
  ReorderImagesSchema,
  UpdateCategorySchema,
  UpdatePlaceSchema,
} from '@place-map/shared'
import { db } from '../db.js'
import { requireApiKey } from '../lib/auth.js'
import { ApiError, badRequest, internal, notFound } from '../lib/errors.js'
import { fetchPage } from '../lib/page.js'
import { purgeCategories, purgePlace } from '../lib/purge.js'
import { CACHE_CONTROL } from '../lib/response.js'
import type { AppBindings } from '../types.js'

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

writes.use('*', requireApiKey)

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

writes.get('/admin/places', async (c) => {
  const page = Math.max(1, Number(c.req.query('page') ?? 1))
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') ?? 50)))
  const categoryId = c.req.query('category_id')
  const search = c.req.query('q')?.trim()

  const supabase = db(c.env)
  const build = (start: number, end: number) => {
    let query = supabase.from('places').select('*', { count: 'exact' })
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

// ---------------------------------------------------------------- categories

writes.post('/categories', async (c) => {
  const body = await parseBody(c, CreateCategorySchema)

  const { data, error } = await db(c.env).from('categories').insert(body).select().single()
  if (error) throw fromPostgres(error, 'create category')

  await purgeCategories(c.env)
  noStore(c)
  return c.json({ data }, 201)
})

writes.patch('/categories/:id', async (c) => {
  const id = parseId(c.req.param('id'))
  const body = await parseBody(c, UpdateCategorySchema)

  const { data, error } = await db(c.env)
    .from('categories')
    .update(body)
    .eq('id', id)
    .select()
    .maybeSingle()

  if (error) throw fromPostgres(error, 'update category')
  if (!data) throw notFound(`Category ${id} not found`)

  await purgeCategories(c.env)
  noStore(c)
  return c.json({ data })
})

writes.delete('/categories/:id', async (c) => {
  const id = parseId(c.req.param('id'))

  // `on delete restrict` on places.category_id means Postgres refuses this
  // while the category still holds places, which is the behaviour we want -
  // deleting a category should never silently orphan or destroy its places.
  const { data, error } = await db(c.env)
    .from('categories')
    .delete()
    .eq('id', id)
    .select()
    .maybeSingle()

  if (error) throw fromPostgres(error, 'delete')
  if (!data) throw notFound(`Category ${id} not found`)

  await purgeCategories(c.env)
  noStore(c)
  return c.json({ data })
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
