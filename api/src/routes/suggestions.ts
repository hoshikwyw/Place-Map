import { Hono } from 'hono'
import { CreateSuggestionSchema } from '@place-map/shared'
import { db } from '../db.js'
import { badRequest, internal, rateLimited } from '../lib/errors.js'
import { SUGGESTIONS, addressOf, tooMany } from '../lib/rate-limit.js'
import { CACHE_CONTROL } from '../lib/response.js'
import type { AppBindings } from '../types.js'

export const suggestions = new Hono<AppBindings>()

/**
 * POST /v1/suggestions
 *
 * One of the two writes with no API key. It creates a row nobody can read
 * back: there is no public GET here, so this endpoint cannot be used to store
 * and serve anything. An editor reads them in the dashboard.
 */
suggestions.post('/', async (c) => {
  let raw: unknown
  try {
    raw = await c.req.json()
  } catch {
    throw badRequest('Body must be valid JSON')
  }

  const parsed = CreateSuggestionSchema.safeParse(raw)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const where = issue?.path.length ? `${issue.path.join('.')}: ` : ''
    throw badRequest(`${where}${issue?.message ?? 'Invalid body'}`)
  }

  const suggestion = parsed.data

  // Filled in means a script filled every field on the page. Answered as if it
  // worked: telling a bot it was detected only teaches it to try again.
  if (suggestion.website) {
    c.header('Cache-Control', CACHE_CONTROL.none)
    return c.json({ data: { received: true } }, 201)
  }

  const address = addressOf(c.req.header('CF-Connecting-IP'))
  if (await tooMany(c.env, address, SUGGESTIONS)) {
    throw rateLimited('That is a lot of suggestions. Try again in an hour.')
  }

  const { error } = await db(c.env)
    .from('suggestions')
    .insert({
      kind: suggestion.kind,
      // A correction names the place it is about; a new place has none yet.
      place_id: suggestion.kind === 'correction' ? (suggestion.place_id ?? null) : null,
      name: suggestion.name ?? null,
      note: suggestion.note,
      contact: suggestion.contact ?? null,
      lang: suggestion.lang ?? null,
    })

  if (error) {
    // A foreign key failure here means the place was deleted between the page
    // loading and the form being sent, which is not the sender's problem.
    console.error('suggestion insert failed', error.message)
    throw internal()
  }

  c.header('Cache-Control', CACHE_CONTROL.none)
  // Nothing about the stored row goes back: the sender has no use for its id,
  // and an endpoint that echoes what it stored invites probing.
  return c.json({ data: { received: true } }, 201)
})
