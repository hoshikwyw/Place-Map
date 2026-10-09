import { Hono } from 'hono'
import { CreateSuggestionSchema } from '@place-map/shared'
import { db } from '../db.js'
import { badRequest, internal, rateLimited } from '../lib/errors.js'
import { CACHE_CONTROL } from '../lib/response.js'
import type { AppBindings, Env } from '../types.js'

export const suggestions = new Hono<AppBindings>()

/** Per address, per hour. Generous for a person, tight for a script. */
const PER_HOUR = 5
const WINDOW_SECONDS = 3600

/**
 * Counts recent submissions from one address.
 *
 * Needs the KV cache binding, which is optional - without it this returns
 * false and the other defences carry the weight: the honeypot, the length
 * limits, and the fact that nothing submitted is ever published. A directory
 * this size would rather accept a little junk in a moderation queue than
 * refuse a genuine suggestion because a cache is not configured.
 */
async function tooMany(env: Env, address: string): Promise<boolean> {
  if (!env.CACHE) return false

  const key = `v1:suggest:${address}`
  try {
    const seen = Number((await env.CACHE.get(key)) ?? 0)
    if (seen >= PER_HOUR) return true

    // The window starts at the first submission and is not extended by later
    // ones, so someone who writes five in a minute waits an hour, not forever.
    await env.CACHE.put(key, String(seen + 1), { expirationTtl: WINDOW_SECONDS })
    return false
  } catch (error) {
    console.error('rate limit check failed', error)
    return false
  }
}

/**
 * POST /v1/suggestions
 *
 * The one write with no API key. It creates a row nobody can read back: there
 * is no public GET here, so this endpoint cannot be used to store and serve
 * anything. An editor reads them in the dashboard.
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

  const address = c.req.header('CF-Connecting-IP') ?? 'unknown'
  if (await tooMany(c.env, address)) {
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
