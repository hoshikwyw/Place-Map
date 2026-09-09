import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import type { ErrorResponse } from '@place-map/shared'
import { setInternalDispatcher } from './bot/api-client.js'
import { webhook } from './bot/webhook.js'
import { db } from './db.js'
import { ApiError } from './lib/errors.js'
import { langMiddleware } from './lib/lang.js'
import { CACHE_CONTROL } from './lib/response.js'
import { categories } from './routes/categories.js'
import { places } from './routes/places.js'
import { search } from './routes/search.js'
import type { AppBindings, Env } from './types.js'

const app = new Hono<AppBindings>()

/**
 * Wide-open CORS is the correct setting here, not a shortcut: /v1 is public,
 * read-only, carries no cookies and no credentials, so any origin reading it
 * learns nothing it could not learn by calling the API directly. It also means
 * Vercel's per-branch preview domains just work - an allowlist would have to
 * guess `place-map-git-<branch>-<team>.vercel.app` in advance and would break
 * every preview deploy.
 *
 * Part 5's write endpoints are never called from a browser - the admin
 * dashboard proxies them server-side - so they stay off this policy.
 */
app.use(
  '/v1/*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'OPTIONS'],
    allowHeaders: ['Accept-Language', 'Content-Type'],
    maxAge: 86400,
  }),
)

app.use('/v1/*', langMiddleware)

// ------------------------------------------------------------------- routes

app.get('/', (c) =>
  c.json({
    name: 'place-map-api',
    version: 'v1',
    docs: [
      'GET /v1/categories',
      'GET /v1/categories/:slug/places?page=1&limit=20',
      'GET /v1/places/:idOrSlug',
      'GET /v1/places/:idOrSlug/images',
      'GET /v1/search?q=...&category=...&page=1&limit=20',
      'GET /v1/health',
    ],
  }),
)

app.get('/v1/health', async (c) => {
  const started = Date.now()
  const { error } = await db(c.env).from('categories').select('id').limit(1)

  c.header('Cache-Control', CACHE_CONTROL.none)
  return c.json(
    {
      data: {
        status: error ? 'degraded' : 'ok',
        database: error ? 'unreachable' : 'ok',
        latency_ms: Date.now() - started,
      },
    },
    error ? 503 : 200,
  )
})

app.route('/v1/categories', categories)
app.route('/v1/places', places)
app.route('/v1/search', search)

// Not under /v1: no CORS (never called from a browser) and no language
// middleware (the bot resolves language from the Telegram client instead).
app.route('/webhook', webhook)

// Lets the bot read through /v1 in-process instead of paying for a second
// billed request to its own public URL. Must run after the routes are mounted.
setInternalDispatcher(app.fetch)

// -------------------------------------------------------------- error shape

app.notFound((c) => {
  c.header('Cache-Control', CACHE_CONTROL.none)
  return c.json<ErrorResponse>(
    { error: { code: 'not_found', message: `No route for ${c.req.method} ${c.req.path}` } },
    404,
  )
})

app.onError((err, c) => {
  c.header('Cache-Control', CACHE_CONTROL.none)

  if (err instanceof ApiError) {
    return c.json<ErrorResponse>({ error: { code: err.code, message: err.message } }, err.status)
  }

  if (err instanceof HTTPException) {
    return c.json<ErrorResponse>(
      { error: { code: err.status === 404 ? 'not_found' : 'bad_request', message: err.message } },
      err.status,
    )
  }

  // Unexpected: log the detail, tell the client nothing. Internal messages leak
  // schema and connection details.
  console.error('unhandled error', err)
  return c.json<ErrorResponse>(
    { error: { code: 'internal', message: 'Something went wrong' } },
    500,
  )
})

// ---------------------------------------------------------------- scheduled

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
