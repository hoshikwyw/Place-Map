import type { MiddlewareHandler } from 'hono'
import type { AppBindings } from '../types.js'

/**
 * Compares without leaking length or position through timing.
 *
 * Workers has no `crypto.timingSafeEqual`. A plain `===` returns on the first
 * differing byte, which is measurable over enough requests and lets an attacker
 * recover the key one character at a time.
 */
function safeEqual(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a)
  const right = new TextEncoder().encode(b)

  // Length is compared as data rather than short-circuited on.
  let diff = left.length ^ right.length
  const length = Math.max(left.length, right.length)

  for (let i = 0; i < length; i++) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0)
  }

  return diff === 0
}

/**
 * Guards every write endpoint.
 *
 * This key is never sent from a browser: the admin dashboard keeps it on its
 * own server and proxies writes, so it is only ever in transit between two
 * servers. That is also why the write routes are excluded from the permissive
 * CORS policy on the read API.
 */
export const requireApiKey: MiddlewareHandler<AppBindings> = async (c, next) => {
  const configured = c.env.ADMIN_API_KEY
  const provided = c.req.header('X-API-Key')

  if (!configured) {
    // Refuse rather than fall open: an unset secret must never mean "allow".
    console.error('ADMIN_API_KEY is not configured - writes are disabled')
    return c.json({ error: { code: 'internal', message: 'Writes are not configured' } }, 500)
  }

  if (!provided || !safeEqual(provided, configured)) {
    return c.json({ error: { code: 'not_found', message: 'Not found' } }, 401)
  }

  await next()
}
