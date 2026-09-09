import type { Context } from 'hono'
import type { z } from 'zod'
import { badRequest } from './errors.js'

/**
 * Query strings are the only untrusted input in a read-only API. Parse them
 * through the shared schemas so `?limit=99999` or `?page=-1` becomes a clean
 * 400 instead of an expensive query.
 */
export function parseQuery<T extends z.ZodType>(c: Context, schema: T): z.infer<T> {
  const result = schema.safeParse(c.req.query())
  if (!result.success) {
    const issue = result.error.issues[0]
    const where = issue?.path.length ? `${issue.path.join('.')}: ` : ''
    throw badRequest(`${where}${issue?.message ?? 'Invalid query parameters'}`)
  }
  return result.data
}
