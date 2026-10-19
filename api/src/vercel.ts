import { app } from './app.js'
import { db } from './db.js'
import type { Env } from './types.js'

/**
 * The same API, on Vercel instead of Cloudflare.
 *
 * Nothing about the application changes: `app` is a plain Hono app and every
 * route already takes its configuration through `c.env` rather than reading
 * globals. All this file does is supply the two things a Worker gets from the
 * runtime - the environment, and a place to put deferred work - and hand the
 * request over.
 *
 * `src/index.ts` is still the Cloudflare entry point and still works. Keeping
 * both costs these forty lines and means the host is a deployment decision
 * rather than a rewrite.
 *
 * Deliberately not `hono/vercel`'s `handle()`: it is `(app) => (req) =>
 * app.fetch(req)`, which drops the env and context arguments this app needs.
 */

/**
 * Just enough of Node to read the environment.
 *
 * Declared here rather than by adding @types/node to the package: this is a
 * Cloudflare Worker project, and pulling in Node's globals would make `fs` and
 * `child_process` look available inside routes where they do not exist. One
 * file needs `process.env`, so one file declares it.
 */
declare const process: { env: Record<string, string | undefined> }

/**
 * Cloudflare hands the Worker its secrets as a bound object; Node puts them in
 * `process.env`. Read once per request rather than at module load, because a
 * serverless instance can outlive a change to them.
 */
function readEnv(): Env {
  const required = (name: string): string => {
    const value = process.env[name]
    if (!value) {
      // Thrown rather than defaulted: a missing SUPABASE_URL should be one
      // loud failure at the first request, not a thousand quiet 500s.
      throw new Error(`Missing environment variable ${name}`)
    }
    return value
  }

  return {
    SUPABASE_URL: required('SUPABASE_URL'),
    SUPABASE_SERVICE_ROLE_KEY: required('SUPABASE_SERVICE_ROLE_KEY'),
    IMAGEKIT_URL_ENDPOINT: required('IMAGEKIT_URL_ENDPOINT'),
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN ?? '',
    TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET ?? '',
    ADMIN_API_KEY: process.env.ADMIN_API_KEY ?? '',
    DEFAULT_LANG: process.env.DEFAULT_LANG ?? 'en',
    SUPPORTED_LANGS: process.env.SUPPORTED_LANGS ?? 'en,my',
    TIME_ZONE: process.env.TIME_ZONE ?? 'Asia/Yangon',
    TELEGRAM_API_BASE: process.env.TELEGRAM_API_BASE,
  } as Env
}

/**
 * A stand-in for the Worker's `ExecutionContext`.
 *
 * On Cloudflare, `waitUntil` keeps the instance alive after the response so
 * deferred work finishes. A serverless function has no such promise: it can be
 * frozen the moment it responds, and anything still running is simply lost -
 * which here would mean a Telegram `file_id` never cached, or a bot reply
 * never sent.
 *
 * So the work is collected and awaited before responding. That costs the
 * caller the time the deferred work takes, and never loses it. It also needs
 * no platform-specific package, so this file runs anywhere Node does.
 */
function deferral() {
  const pending: Promise<unknown>[] = []

  return {
    ctx: {
      waitUntil: (promise: Promise<unknown>) => {
        pending.push(
          // A rejection here must not take down the response that was already
          // decided; Cloudflare treats these the same way.
          Promise.resolve(promise).catch((error: unknown) => {
            console.error('deferred work failed', error)
          }),
        )
      },
      passThroughOnException: () => {},
    },
    settle: () => Promise.all(pending),
  }
}

/**
 * Keeps Supabase from pausing. On Cloudflare this was the Worker's `scheduled`
 * handler; Vercel's cron calls a URL instead, so it is a route here.
 *
 * Guarded by CRON_SECRET, which Vercel sends as a bearer token when the
 * variable is set. Unset, the path is simply closed - an open endpoint that
 * touches the database is not worth the convenience.
 */
async function keepalive(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET
  if (!secret) return new Response('Not found', { status: 404 })
  if (request.headers.get('Authorization') !== `Bearer ${secret}`) {
    return new Response('Not found', { status: 404 })
  }

  const { error } = await db(readEnv()).from('categories').select('id').limit(1)
  if (error) {
    console.error('keepalive failed', error.message)
    return new Response('keepalive failed', { status: 500 })
  }

  console.log('keepalive ok')
  return new Response('ok')
}

async function handle(request: Request): Promise<Response> {
  if (new URL(request.url).pathname === '/internal/keepalive') {
    return keepalive(request)
  }

  const { ctx, settle } = deferral()

  // Cast because Cloudflare's ExecutionContext also declares `props`,
  // `tracing` and friends, which are its own internals and have no meaning
  // here. The only members this application ever touches are `waitUntil`
  // (twice) and `passThroughOnException` (never) - both supplied above - so
  // the cast hides nothing that could be reached at run time.
  const response = await app.fetch(request, readEnv(), ctx as unknown as ExecutionContext)
  await settle()
  return response
}

/**
 * Exported as `{ fetch }`, not as a bare function. Vercel's Node runtime calls
 * a bare default export as `(req, res)` with Node's IncomingMessage, whose
 * `url` is only a path - `new URL()` threw on it and every request died as
 * FUNCTION_INVOCATION_FAILED. The `fetch` shape is the one it hands a web
 * `Request` to.
 *
 * Anything that escapes is caught here so it reaches the logs and the caller
 * gets the API's usual error body, rather than Vercel's crash page with no
 * trace of which variable was missing.
 */
export default {
  async fetch(request: Request): Promise<Response> {
    try {
      return await handle(request)
    } catch (error) {
      console.error('request failed', error)
      return Response.json({ error: { code: 'internal', message: 'Something went wrong' } }, { status: 500 })
    }
  },
}
