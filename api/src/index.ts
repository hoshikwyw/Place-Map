import { app } from './app.js'
import { db } from './db.js'
import type { Env } from './types.js'

/**
 * The Worker's entry points and nothing else - the HTTP application lives in
 * app.ts. Keeping this file to its default export avoids any named export
 * being mistaken by Wrangler for a Durable Object or entrypoint class.
 */

/**
 * Supabase's free tier pauses a project after 7 days without a database
 * request, and unpausing is manual. One cheap query a day prevents it.
 */
async function keepalive(env: Env) {
  const { error } = await db(env).from('categories').select('id').limit(1)
  if (error) console.error('keepalive failed', error.message)
  else console.log('keepalive ok')
}

export default {
  fetch: app.fetch,
  scheduled: async (_event: ScheduledController, env: Env, ctx: ExecutionContext) => {
    ctx.waitUntil(keepalive(env))
  },
} satisfies ExportedHandler<Env>
