import { parseArgs } from 'node:util'

/**
 * Checks a *deployed* Place Map against what it is supposed to be.
 *
 *   pnpm --filter @place-map/scripts smoke -- --api https://place-map-api.you.workers.dev
 *   pnpm --filter @place-map/scripts smoke -- --api <url> --site https://place-map.vercel.app
 *   pnpm --filter @place-map/scripts smoke -- --api <url> --key $ADMIN_API_KEY
 *
 * This is not a test suite - the test suite runs against the code. This runs
 * against the thing on the internet, and its job is to catch the handful of
 * mistakes that only exist once something is deployed: a migration that was
 * never run, a secret that was never set, a Worker pointing at the wrong
 * Supabase project, a site built before an environment variable existed.
 *
 * It is **read-only by default**. Every check is a GET, an OPTIONS, or a write
 * that is deliberately invalid and so stores nothing. Nothing here writes to
 * your database unless you pass --write, which sends one suggestion so you can
 * confirm the one public write works end to end.
 *
 * A failure prints what to do about it, because at that moment you are
 * deploying and do not want to go and read the README.
 */

const { values } = parseArgs({
  options: {
    api: { type: 'string' },
    site: { type: 'string' },
    key: { type: 'string' },
    write: { type: 'boolean', default: false },
  },
})

const api = (values.api ?? process.env.PLACE_MAP_API_URL ?? '').replace(/\/+$/, '')
const site = (values.site ?? process.env.SITE_URL ?? '').replace(/\/+$/, '')
const key = values.key ?? process.env.ADMIN_API_KEY ?? ''

if (!api) {
  console.error('Need --api https://place-map-api.<you>.workers.dev (or PLACE_MAP_API_URL in .env)')
  process.exit(1)
}

// ---------------------------------------------------------------- reporting

let failures = 0
let checks = 0
let group = ''

const GREEN = '\u001b[32m'
const RED = '\u001b[31m'
const DIM = '\u001b[2m'
const RESET = '\u001b[0m'

function heading(title: string) {
  group = title
  console.log(`\n${title}`)
}

/** `fix` is printed only on failure: what to do, not why it matters. */
function check(label: string, ok: boolean, detail?: string, fix?: string) {
  checks += 1
  if (ok) {
    console.log(`  ${GREEN}ok${RESET}   ${label}${detail ? ` ${DIM}${detail}${RESET}` : ''}`)
    return
  }
  failures += 1
  console.log(`  ${RED}FAIL${RESET} ${label}${detail ? ` ${DIM}${detail}${RESET}` : ''}`)
  if (fix) console.log(`       ${DIM}→ ${fix}${RESET}`)
}

/** A whole group could not run - a failure, not a silent skip. */
function broke(error: unknown, fix: string) {
  failures += 1
  console.log(`  ${RED}FAIL${RESET} ${group} could not be checked`)
  console.log(`       ${DIM}${error instanceof Error ? error.message : String(error)}${RESET}`)
  console.log(`       ${DIM}→ ${fix}${RESET}`)
}

// ------------------------------------------------------------------ fetching

/**
 * Generous on purpose. A cold Worker, a Vercel function waking up, and the
 * sitemap - which walks every place in the directory - are all slow the first
 * time, and a smoke test that reports a timeout as a failure sends somebody
 * hunting for a problem that does not exist.
 */
const TIMEOUT_MS = 45_000

interface Result {
  status: number
  headers: Headers
  body: unknown
  text: string
}

async function hit(url: string, init: RequestInit = {}, timeoutMs = TIMEOUT_MS): Promise<Result> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { ...init, signal: controller.signal, redirect: 'manual' })
    const text = await response.text()
    let body: unknown = null
    try {
      body = JSON.parse(text)
    } catch {
      // Not JSON - fine for /docs, the sitemap and the service worker.
    }
    return { status: response.status, headers: response.headers, body, text }
  } finally {
    clearTimeout(timer)
  }
}

const data = <T>(result: Result): T => (result.body as { data?: T })?.data as T

// --------------------------------------------------------------------- API

interface Category {
  slug: string
  name: string
}

interface Place {
  id: number
  slug: string
  name: string
  [key: string]: unknown
}

/** Fields a client reads, and the migration each one needs. */
const FIELD_MIGRATIONS: [field: string, migration: string][] = [
  ['rating', '0004_ratings_and_reviews.sql'],
  ['links', '0005_place_links.sql'],
  ['price', '0006_price_and_amenities.sql'],
  ['amenities', '0006_price_and_amenities.sql'],
]

async function checkApi(): Promise<Place | null> {
  heading(`API  ${api}`)

  // The one check worth having on its own: it says whether the Worker can
  // reach Supabase at all, which is the usual reason a fresh deploy is dead.
  const health = await hit(`${api}/v1/health`)
  const status = (health.body as { data?: { status?: string; database?: string } })?.data
  check('health says ok', health.status === 200 && status?.status === 'ok', `status ${health.status}`,
    'The Worker is not deployed, or the URL is wrong. `cd api && npx wrangler deploy`.')
  check('the database is reachable', status?.database === 'ok', status?.database,
    'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is wrong or unset. Set them with `npx wrangler secret put`, then redeploy.')
  check('health is never cached', health.headers.get('cache-control')?.includes('no-store') === true,
    health.headers.get('cache-control') ?? 'absent')

  const categories = await hit(`${api}/v1/categories`)
  const rows = data<Category[]>(categories) ?? []
  check('categories load', categories.status === 200 && rows.length > 0, `${rows.length} categories`,
    'Migration 0001 or db/seed.sql has not been run. See db/migrations/.')
  check('categories are cached for a while', /max-age=\d+/.test(categories.headers.get('cache-control') ?? ''),
    categories.headers.get('cache-control') ?? 'absent')

  // Both languages come from the database, so this fails when only one was
  // ever filled in - which no amount of testing the code would catch.
  const my = await hit(`${api}/v1/categories?lang=my`)
  const myRows = data<Category[]>(my) ?? []
  const translated = rows.length > 0 && myRows.some((row, index) => row.name !== rows[index]?.name)
  check('Myanmar names are in the database', translated,
    myRows[0]?.name ? `first: ${myRows[0].name}` : undefined,
    'Places and categories have no Myanmar names, so /my shows English. Fill them in the dashboard.')

  const amenities = await hit(`${api}/v1/amenities`)
  check('the amenity catalog loads', amenities.status === 200, `status ${amenities.status}`,
    'Run db/migrations/0007_amenities_table.sql, then its seed rows.')
  check('the amenity catalog is not empty', (data<unknown[]>(amenities) ?? []).length > 0,
    `${(data<unknown[]>(amenities) ?? []).length} amenities`,
    'The table exists but has no rows. Add amenities in the dashboard, or run the seed.')

  const first = rows[0]
  if (!first) return null

  const listing = await hit(`${api}/v1/categories/${first.slug}/places`)
  const places = data<Place[]>(listing) ?? []
  check(`places load for "${first.slug}"`, listing.status === 200 && places.length > 0,
    `${places.length} places`,
    'The category has no visible places. Check `is_active` in the dashboard, or run db/seed.sql.')

  const sample = places[0]
  if (!sample) return null

  const place = await hit(`${api}/v1/places/${sample.slug}`)
  const detail = data<Place>(place)
  check(`one place loads by slug`, place.status === 200 && Boolean(detail?.name), sample.slug)

  if (detail) {
    // Each missing field names the migration that would have added it. This
    // is the whole reason to run a smoke test against a deployment: the code
    // is correct and the database is behind it.
    for (const [field, migration] of FIELD_MIGRATIONS) {
      check(`places carry \`${field}\``, field in detail, undefined, `Run db/migrations/${migration}`)
    }
  }

  const images = await hit(`${api}/v1/places/${sample.id}/images`)
  check('place images load', images.status === 200, `status ${images.status}`)

  const placeReviews = await hit(`${api}/v1/places/${sample.slug}/reviews`)
  check('published reviews load', placeReviews.status === 200, `status ${placeReviews.status}`,
    'Run db/migrations/0004_ratings_and_reviews.sql, then 0010_reviews_live.sql.')

  const assistant = await hit(`${api}/v1/assistant?q=cafe`)
  const reply = (assistant.body as { data?: { reply?: string } })?.data?.reply
  check('the assistant answers', assistant.status === 200 && Boolean(reply), reply?.slice(0, 48))

  const short = await hit(`${api}/v1/search?q=a`)
  check('a bad request is a 400, not a 500', short.status === 400, `status ${short.status}`)

  const missing = await hit(`${api}/v1/places/definitely-not-a-place`)
  check('an unknown place is a 404', missing.status === 404, `status ${missing.status}`)

  const docs = await hit(`${api}/openapi.json`)
  check('the OpenAPI document serves', docs.status === 200 && (docs.body as { openapi?: string })?.openapi === '3.1.0')

  return detail ?? null
}

// ------------------------------------------------------------------ locking

async function checkLocks() {
  heading('Locks')

  const write = await hit(`${api}/v1/places`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  })
  check('writes need the API key', write.status === 401, `status ${write.status}`,
    'ADMIN_API_KEY is unset on the Worker, so writes are open. Set it and redeploy immediately.')

  const adminRead = await hit(`${api}/v1/admin/categories`)
  check('admin reads need the API key', adminRead.status === 401, `status ${adminRead.status}`,
    'Unpublished rows are readable by anyone. Set ADMIN_API_KEY and redeploy.')

  const wrongKey = await hit(`${api}/v1/places`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': 'not-the-key' },
    body: '{}',
  })
  check('a wrong key is refused', wrongKey.status === 401, `status ${wrongKey.status}`)

  const preflight = (path: string, method: string) =>
    hit(`${api}${path}`, {
      method: 'OPTIONS',
      headers: { Origin: 'https://example.test', 'Access-Control-Request-Method': method },
    })

  const read = await preflight('/v1/places', 'GET')
  check('a browser may read the API', read.headers.get('access-control-allow-methods')?.includes('GET') === true,
    read.headers.get('access-control-allow-methods') ?? 'absent')
  check('a browser may not write to it', read.headers.get('access-control-allow-methods')?.includes('POST') !== true,
    read.headers.get('access-control-allow-methods') ?? 'absent',
    'CORS allows writes from any page. Check the policy in api/src/app.ts.')

  const suggest = await preflight('/v1/suggestions', 'POST')
  check('except the suggestion form', suggest.headers.get('access-control-allow-methods')?.includes('POST') === true,
    suggest.headers.get('access-control-allow-methods') ?? 'absent',
    'The website cannot send suggestions. Deploy the API version that allows POST on /v1/suggestions.')

  // Proves the route is mounted and guarded, without delivering an update.
  const webhook = await hit(`${api}/webhook/telegram`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Telegram-Bot-Api-Secret-Token': 'wrong' },
    body: '{}',
  })
  check('the bot webhook refuses a wrong secret', webhook.status === 401, `status ${webhook.status}`,
    'TELEGRAM_WEBHOOK_SECRET is unset, so anyone can drive the bot. Set it and redeploy.')
}

// -------------------------------------------------------------- suggestions

async function checkSuggestions() {
  heading('Suggestions')

  const invalid = await hit(`${api}/v1/suggestions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'new_place', note: 'no' }),
  })
  check('the form endpoint validates', invalid.status === 400, `status ${invalid.status}`,
    'Deploy the API version that serves POST /v1/suggestions.')

  if (!values.write) {
    // Validation happens before the insert, so the check above proves the
    // endpoint is deployed but says nothing about whether its table exists.
    // Reading the admin queue does, which is why --key is offered here.
    const alternative = key
      ? 'the /v1/admin/suggestions check below confirms its table exists'
      : 'pass --key to confirm its table exists by reading the queue'
    console.log(`       ${DIM}Nothing was stored. Pass --write to send one real suggestion, or${RESET}`)
    console.log(`       ${DIM}${alternative}.${RESET}`)
    return
  }

  const sent = await hit(`${api}/v1/suggestions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kind: 'new_place',
      name: 'Smoke test',
      note: `Sent by scripts/smoke.ts at ${new Date().toISOString()}. Safe to delete.`,
      lang: 'en',
    }),
  })
  check('a real suggestion is stored', sent.status === 201, `status ${sent.status}`,
    'Run db/migrations/0009_suggestions.sql - the table does not exist yet.')
  if (sent.status === 201) {
    console.log(`       ${DIM}Delete it in the dashboard under Suggestions.${RESET}`)
  }
}

// ----------------------------------------------------------------- reviews

async function checkReviews() {
  heading('Reviews')

  const invalid = await hit(`${api}/v1/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ place_id: 1, rating: 9 }),
  })
  check('the review endpoint validates', invalid.status === 400, `status ${invalid.status}`,
    'Deploy the API version that serves POST /v1/reviews.')

  const noPlace = await hit(`${api}/v1/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ place_id: 999_999_999, rating: 5 }),
  })
  check('it refuses a review of a place that does not exist', noPlace.status === 404,
    `status ${noPlace.status}`)

  console.log(`       ${DIM}Nothing was stored: both requests above are deliberately invalid.${RESET}`)
  console.log(`       ${DIM}Whether a review would be held for approval is a database default,${RESET}`)
  console.log(`       ${DIM}checked by db/check.sql rather than from out here.${RESET}`)
}

// ------------------------------------------------------------------- admin

async function checkAdmin() {
  if (!key) {
    console.log(`\nAdmin  ${DIM}skipped - pass --key $ADMIN_API_KEY to check these too${RESET}`)
    return
  }

  heading('Admin')
  const headers = { 'X-API-Key': key }

  // Each of these is also a migration check: the route 500s when its table is
  // missing, which is exactly how a half-run migration list shows up.
  const routes: [path: string, fix: string][] = [
    ['/v1/admin/categories', 'Run db/migrations/0001_init.sql'],
    ['/v1/admin/places', 'Run db/migrations/0001_init.sql'],
    ['/v1/admin/amenities', 'Run db/migrations/0007_amenities_table.sql'],
    ['/v1/admin/suggestions', 'Run db/migrations/0009_suggestions.sql'],
    ['/v1/admin/reviews', 'Run db/migrations/0004_ratings_and_reviews.sql'],
  ]

  for (const [path, fix] of routes) {
    const result = await hit(`${api}${path}`, { headers })
    check(`${path} reads`, result.status === 200, `status ${result.status}`,
      result.status === 401 ? 'The key is wrong - check ADMIN_API_KEY matches the Worker secret.' : fix)
  }
}

// -------------------------------------------------------------------- site

async function checkSite() {
  if (!site) {
    console.log(`\nWebsite  ${DIM}skipped - pass --site https://... to check it too${RESET}`)
    return
  }

  heading(`Website  ${site}`)

  const root = await hit(site)
  check('the root redirects to a language', [301, 302, 307, 308].includes(root.status),
    `status ${root.status} → ${root.headers.get('location') ?? '?'}`,
    'The locale middleware is not running. Check middleware.ts shipped in the build.')

  const en = await hit(`${site}/en`)
  check('/en loads', en.status === 200 && en.text.includes('Place Map'), `status ${en.status}`,
    'The site cannot reach the API. Set PLACE_MAP_API_URL in the Vercel project and redeploy.')

  const my = await hit(`${site}/my`)
  check('/my loads in Myanmar', my.status === 200 && /[က-႟]/.test(my.text), `status ${my.status}`)

  const place = await hit(`${site}/en/suggest`)
  check('the suggestion form is reachable', place.status === 200, `status ${place.status}`,
    'Redeploy the website - this page is newer than the build.')

  const sitemap = await hit(`${site}/sitemap.xml`)
  check('the sitemap builds', sitemap.status === 200 && sitemap.text.includes('<urlset'), `status ${sitemap.status}`,
    'The sitemap calls the API for every place; a failure here usually means the API is unreachable from Vercel.')

  const robots = await hit(`${site}/robots.txt`)
  check('robots.txt serves', robots.status === 200)

  const manifest = await hit(`${site}/manifest.webmanifest`)
  const manifestBody = manifest.body as { name?: string; icons?: unknown[] } | null
  check('the web app manifest serves', manifest.status === 200 && Boolean(manifestBody?.name),
    manifestBody?.name)
  check('the manifest has icons', (manifestBody?.icons ?? []).length > 0,
    `${(manifestBody?.icons ?? []).length} icons`,
    'Without icons the install prompt never appears.')

  const worker = await hit(`${site}/sw.js`)
  check('the service worker serves', worker.status === 200 && worker.text.includes('addEventListener'),
    `status ${worker.status}`)

  // This one is specific: /offline must NOT be rewritten by the locale
  // middleware, or the service worker caches a redirect and the offline page
  // never appears. It is a file with an extension precisely to avoid that.
  const offline = await hit(`${site}/offline.html`)
  check('the offline page serves directly', offline.status === 200, `status ${offline.status}`,
    'The service worker will fail to install. Check middleware.ts skips paths with a dot.')
}

// -------------------------------------------------------------------- main

async function main() {
  console.log(`Place Map smoke test  ${DIM}${new Date().toISOString()}${RESET}`)

  try {
    await checkApi()
  } catch (error) {
    broke(error, `Could not reach ${api}. Check the URL, and that the Worker is deployed.`)
  }

  try {
    await checkLocks()
  } catch (error) {
    broke(error, 'The API stopped answering partway through.')
  }

  try {
    await checkSuggestions()
  } catch (error) {
    broke(error, 'The API stopped answering partway through.')
  }

  try {
    await checkReviews()
  } catch (error) {
    broke(error, 'The API stopped answering partway through.')
  }

  try {
    await checkAdmin()
  } catch (error) {
    broke(error, 'The admin routes could not be reached.')
  }

  try {
    await checkSite()
  } catch (error) {
    broke(error, `Could not reach ${site}. Check the URL and that Vercel finished deploying.`)
  }

  console.log()
  if (failures === 0) {
    console.log(`${GREEN}All ${checks} checks passed.${RESET}`)
    return
  }
  console.log(`${RED}${failures} of ${checks} checks failed.${RESET} Fix the lines marked FAIL above, then run this again.`)
  process.exitCode = 1
}

await main()
