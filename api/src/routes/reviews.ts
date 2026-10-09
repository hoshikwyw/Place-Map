import { Hono } from 'hono'
import { CreateReviewSchema } from '@place-map/shared'
import { db } from '../db.js'
import { badRequest, internal, notFound, rateLimited } from '../lib/errors.js'
import { REVIEWS, addressOf, tooMany } from '../lib/rate-limit.js'
import { CACHE_CONTROL } from '../lib/response.js'
import type { AppBindings } from '../types.js'

export const reviews = new Hono<AppBindings>()

/**
 * POST /v1/reviews
 *
 * The second write with no API key, and the riskier one. A suggestion is a
 * private message to an editor; a review is meant to be published, under a
 * name somebody typed, on a page about a real business.
 *
 * So nothing is published on arrival. The row is stored unpublished - the
 * column defaults to that since migration 0010, so this does not depend on
 * remembering - and an editor approves it. Until then the place's rating does
 * not move, because the trigger counts published reviews only.
 *
 * Like suggestions, the response says nothing about the stored row: no id, and
 * no hint of whether anything was stored at all.
 */
reviews.post('/', async (c) => {
  let raw: unknown
  try {
    raw = await c.req.json()
  } catch {
    throw badRequest('Body must be valid JSON')
  }

  const parsed = CreateReviewSchema.safeParse(raw)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const where = issue?.path.length ? `${issue.path.join('.')}: ` : ''
    throw badRequest(`${where}${issue?.message ?? 'Invalid body'}`)
  }

  const review = parsed.data

  // Filled in means a script filled every field on the page. Answered as if it
  // worked: telling a bot it was detected only teaches it to try again.
  if (review.website) {
    c.header('Cache-Control', CACHE_CONTROL.none)
    return c.json({ data: { received: true } }, 201)
  }

  const address = addressOf(c.req.header('CF-Connecting-IP'))
  if (await tooMany(c.env, address, REVIEWS)) {
    throw rateLimited('That is a lot of reviews at once. Try again in an hour.')
  }

  const supabase = db(c.env)

  // Checked before inserting rather than leaning on the foreign key: a review
  // of a hidden or deleted place would sit in the queue looking real, and an
  // editor would have no way to tell what it was about.
  const { data: place, error: placeError } = await supabase
    .from('places')
    .select('id')
    .eq('id', review.place_id)
    .eq('is_active', true)
    .maybeSingle()

  if (placeError) {
    console.error('review place lookup failed', placeError.message)
    throw internal()
  }
  if (!place) throw notFound(`Place ${review.place_id} not found`)

  const { error } = await supabase.from('reviews').insert({
    place_id: review.place_id,
    rating: review.rating,
    comment: review.comment ?? null,
    author: review.author ?? null,
    // Explicit, though the column defaults to it. Two statements of the same
    // rule is the right number for the one that decides what strangers see.
    is_published: false,
  })

  if (error) {
    console.error('review insert failed', error.message)
    throw internal()
  }

  c.header('Cache-Control', CACHE_CONTROL.none)
  // Deliberately the same shape and the same words as a filled honeypot, so
  // the two are indistinguishable from outside.
  return c.json({ data: { received: true } }, 201)
})
