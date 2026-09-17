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
import { assistant } from './routes/assistant.js'
import { categories } from './routes/categories.js'
import { docs } from './routes/docs.js'
import { places } from './routes/places.js'
import { search } from './routes/search.js'
import { writes } from './routes/writes.js'
import type { AppBindings } from './types.js'

/**
 * The HTTP application. Kept apart from index.ts, which holds only the Worker's
 * entry points, so tests can inspect the mounted routes - test/docs.test.ts
 * checks every one of them is described in the OpenAPI document.
 */
export const app = new Hono<AppBindings>()

/**
 * Wide-open CORS is the correct setting here, not a shortcut: /v1 is public,
 * read-only, carries no cookies and no credentials, so any origin reading it
 * learns nothing it could not learn by calling the API directly. It also means
 * Vercel's per-branch preview domains just work - an allowlist would have to
 * guess `place-map-git-<branch>-<team>.vercel.app` in advance and would break
 * every preview deploy.
 *
 * Other sites cannot send writes: this policy allows only GET and OPTIONS. The
 * admin dashboard calls writes from its server, and /docs is served from this
 * same origin, where CORS does not apply.
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
    docs: '/docs',
    openapi: '/openapi.json',
    health: '/v1/health',
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
app.route('/v1/assistant', assistant)

// Same resource paths, write methods. Mounted after the read routes; Hono
// matches on method as well as path, so nothing here shadows a GET. Every
// write and every /v1/admin read sits behind the API-key guard.
app.route('/v1', writes)

// Not under /v1: no CORS (never called from a browser) and no language
// middleware (the bot resolves language from the Telegram client instead).
app.route('/webhook', webhook)

// /openapi.json and /docs.
app.route('/', docs)

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
    // Routes raise `internal` with the database's own message, which names
    // columns, types and values. Log it where only operators see it; never
    // send it. Every other code carries a message written for the client.
    if (err.code === 'internal') {
      console.error('internal error', err.message)
      return c.json<ErrorResponse>({ error: { code: 'internal', message: 'Something went wrong' } }, 500)
    }
    return c.json<ErrorResponse>({ error: { code: err.code, message: err.message } }, err.status)
  }

  if (err instanceof HTTPException) {
    return c.json<ErrorResponse>(
      { error: { code: err.status === 404 ? 'not_found' : 'bad_request', message: err.message } },
      err.status,
    )
  }

  // Unexpected: log the detail, tell the client nothing.
  console.error('unhandled error', err)
  return c.json<ErrorResponse>({ error: { code: 'internal', message: 'Something went wrong' } }, 500)
})
