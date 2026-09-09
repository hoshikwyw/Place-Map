# Place Map

Places directory. One API, three clients: Telegram bot, web app, native app.
Zero budget, no credit card.

```
                 Postgres (Supabase)
                        |
                 REST API (Cloudflare Workers + Hono)
            /           |            \
   Telegram bot     Web app       Native app
                                 Admin dashboard
```

The rule: **nothing talks to the database except the API.** Bot, web, native and
the admin dashboard are all just HTTP clients.

## Locked decisions

| Decision | Choice | Consequence |
|---|---|---|
| Languages | Multi-language `jsonb` | `name` / `description` are `{"en":..,"uz":..}`; API resolves to one string via `?lang=` or `Accept-Language` |
| Data entry | Custom admin dashboard | Write endpoints + `X-API-Key` auth are needed (Part 5), not "later" |
| Launch size | Under 500 places | Simple `ILIKE` search; no Postgres full-text indexes yet |
| Stack | TypeScript | Workers is JS-native |
| Web hosting | Vercel (Hobby) | Public site only; the API stays on Workers. Hobby is non-commercial - see below |

## Tech stack

TypeScript everywhere, pnpm workspaces, one API that all three clients consume.

### Backend - API + Telegram bot (`api/`)

| Concern | Choice |
|---|---|
| Runtime | Cloudflare Workers |
| Framework | Hono |
| Database | Supabase (Postgres) |
| DB access | `@supabase/supabase-js` (PostgREST over HTTP - Workers can't pool TCP) |
| Validation | Zod (shared with the dashboard's forms) |
| Cache | `Cache-Control` headers + Workers KV |
| Telegram | Raw Bot API over `fetch` - no library |
| Scheduled jobs | Workers Cron Triggers (daily DB keepalive) |
| Deploy | Wrangler; secrets via `wrangler secret put` |
| Tests | Vitest + `@cloudflare/vitest-pool-workers` |

No ORM. Three tables and raw SQL migrations; Prisma's engine does not fit the
10 ms CPU budget. No bot framework - the bot is ~200 lines of `fetch` calls, and
grammY's middleware stack is weight you would pay for on every webhook.

### Frontend - public web app (`web/`)

| Concern | Choice |
|---|---|
| Framework | Next.js 15, App Router, React 19 |
| Styling | Tailwind CSS v4 |
| Data | `fetch` in server components, `revalidate` for ISR |
| Maps | MapLibre GL JS + Protomaps or MapTiler tiles |
| Images | `next/image` with a custom ImageKit loader |
| i18n | `next-intl` (locale in the path: `/en/...`, `/uz/...`) |
| SEO | Next metadata API + generated sitemap |
| Hosting | Vercel |

### Frontend - admin dashboard (`admin/`)

| Concern | Choice |
|---|---|
| Framework | Next.js 15, App Router |
| UI | shadcn/ui + Tailwind |
| Forms | React Hook Form + Zod resolver |
| Tables | TanStack Table |
| Client data | TanStack Query |
| Auth | Password login -> httpOnly cookie -> Next route handler proxies to the API |
| Hosting | Vercel |

The dashboard is the **one** place a Next.js route handler is allowed, and only
as a credential proxy: `ADMIN_API_KEY` must never reach the browser, so writes
go browser -> Next route handler (adds `X-API-Key`) -> Worker. That handler
forwards requests; it contains no business logic and never touches Supabase.

### App - native (`mobile/`)

| Concern | Choice |
|---|---|
| Framework | Expo (React Native) |
| Routing | Expo Router (file-based, mirrors Next.js) |
| Styling | NativeWind (Tailwind syntax on RN) |
| Data | TanStack Query with persisted cache for offline |
| Maps | `@maplibre/maplibre-react-native` |
| Builds | EAS Build free tier, Expo Go for development |

### Shared (`packages/shared/`)

Zod schemas and the TypeScript types derived from them - `Place`, `Category`,
`OpeningHours`, the response envelope. Imported by the API, the dashboard, the
web app and the native app, so a schema change breaks the build instead of
breaking production.

### Card-free warnings

- **Cloudflare R2** - requires a payment method to activate. Not used.
- **Google Maps** (`react-native-maps` default, Google Maps JS API) - needs a
  Google Cloud billing account, which needs a card. This is why maps are
  MapLibre + OSM-derived tiles on both web and native.
- **Vercel Hobby** - free but non-commercial only. See Hosting split below.

## Build parts

- [x] **Part 1** - Repo scaffold + database schema + seed
- [x] **Part 2** - Read-only API (`/v1/categories`, `/v1/places`, `/v1/search`)
- [x] **Part 3** - Image pipeline (resize -> ImageKit -> `place_images`)
- [ ] **Part 4** - Telegram bot (webhook, category keyboard, paginated list, place detail)
- [ ] **Part 5** - Write endpoints + admin dashboard (CRUD)
- [ ] **Part 6** - Public web app (Next.js on Vercel)
- [ ] **Part 7** - Native app (Expo)

---

## Part 0 - Accounts (do this by hand, ~30 min)

Free tiers change and marketing pages lag. For each service, walk all the way to
**creating the project / bucket** - that is where a card wall appears, not at
signup. Note the result next to each box.

### 1. Supabase (database)

1. https://supabase.com -> sign up with GitHub.
2. **New project**. Name `place-map`, region closest to your users.
3. Set a strong database password and **save it** - it is shown once.
4. Wait ~2 min for provisioning.
5. Copy from **Project Settings -> API**:
   - Project URL -> `SUPABASE_URL`
   - `anon` `public` key -> `SUPABASE_ANON_KEY`
   - `service_role` key -> `SUPABASE_SERVICE_ROLE_KEY` (secret, server only)
6. Copy from **Project Settings -> Database -> Connection string -> URI**:
   -> `DATABASE_URL` (used only by local scripts and backups)

- [ ] No card was requested

### 2. Cloudflare (API hosting)

1. https://dash.cloudflare.com/sign-up -> verify email.
2. Nothing else to click yet - `wrangler` creates the Worker in Part 2.

- [ ] No card was requested

### 3. Telegram bot

1. Open [@BotFather](https://t.me/BotFather) -> `/newbot`.
2. Pick a display name and a username ending in `bot`.
3. Copy the token -> `TELEGRAM_BOT_TOKEN`.
4. Invent a random string for `TELEGRAM_WEBHOOK_SECRET` (e.g.
   `openssl rand -hex 32`). You choose this one, Telegram does not give it.

- [ ] Token saved

### 4. ImageKit (image CDN) - needed at Part 3, not before

1. https://imagekit.io -> sign up.
2. Create the media library / URL endpoint.
3. Copy URL endpoint, public key, private key.

- [ ] Card wall at bucket creation?  If yes, use Cloudinary instead.

**Do not use Cloudflare R2** - it requires a payment method to activate.

### 5. Local env file

```bash
cp .env.example .env
```

Fill it in. `.env` is gitignored and must stay that way. The Worker does **not**
read `.env` - its secrets are set separately in Part 2.

---

## Part 1 - Database

Run the migration, then the seed.

**Option A - Supabase Studio (no local Postgres needed):**

1. Supabase dashboard -> **SQL Editor** -> **New query**
2. Paste all of `db/migrations/0001_init.sql` -> **Run**
3. New query -> paste all of `db/seed.sql` -> **Run**

**Option B - psql, if you have it:**

```bash
psql "$DATABASE_URL" -f db/migrations/0001_init.sql
psql "$DATABASE_URL" -f db/seed.sql
```

### Verify

In the SQL Editor:

```sql
select p.slug, p.name->>'en' as name_en, c.slug as category
from places p join categories c on c.id = p.category_id
order by c.sort_order, p.sort_order;
```

You should see 3 places across 3 categories.

### Notes on the schema

- `name` / `description` are `jsonb` keyed by locale. Clients never see this
  shape - the API flattens it to a string.
- `opening_hours` is `{"mon": [["09:00","18:00"]], "sun": []}`. Empty array =
  closed. Nested arrays handle split shifts.
- `place_images` stores each image **twice as a reference**: `storage_path`
  (ImageKit, for web/native) and `telegram_file_id` (filled lazily on the bot's
  first send, so Telegram serves it free forever after).
- RLS is enabled with **no policies**. The Worker uses the `service_role` key,
  which bypasses RLS; the `anon` key can read nothing. A leaked anon key in the
  web app is therefore harmless.

### Changing the locales

The seed uses `en` and `uz`. If yours differ, change them in `db/seed.sql`
before running it, and keep `DEFAULT_LANG` in the API (Part 2) matching one of
them.

---

## Part 2 - API

The Worker in `api/`. Everything else in this repo is a client of it.

### Run the new migration first

`db/migrations/0002_search.sql` adds the `search_text` column that `/v1/search`
filters on. Run it the same way as 0001 (SQL Editor, or `psql`).

### Local

```bash
pnpm install
cp api/.dev.vars.example api/.dev.vars     # fill in the three values
pnpm dev                                    # http://localhost:8787
```

`.dev.vars` is gitignored. `wrangler dev` reads it; production secrets are set
separately below.

```bash
curl "http://localhost:8787/v1/health"
curl "http://localhost:8787/v1/categories"
curl "http://localhost:8787/v1/categories/cafes/places?page=1&limit=5"
curl "http://localhost:8787/v1/places/cafe-central"
curl "http://localhost:8787/v1/search?q=cafe"
curl "http://localhost:8787/v1/categories?lang=uz"
```

### Deploy

```bash
cd api
npx wrangler login
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put IMAGEKIT_URL_ENDPOINT
npx wrangler deploy
```

You get `https://place-map-api.<your-subdomain>.workers.dev`. Hit `/v1/health`
before anything else - it reports whether the Worker can reach Postgres.

### Optional: KV cache

Not required. Turn it on when Supabase egress starts climbing:

```bash
npx wrangler kv namespace create CACHE
```

Paste the printed id into the commented `[[kv_namespaces]]` block in
`api/wrangler.toml`, uncomment it, redeploy. Without the binding every helper
falls straight through to Postgres, so nothing breaks either way.

### Endpoints

| Method | Path | Cache-Control |
|---|---|---|
| GET | `/v1/health` | `no-store` |
| GET | `/v1/categories` | 1 hour |
| GET | `/v1/categories/:slug/places?page&limit` | 5 min |
| GET | `/v1/places/:idOrSlug` | 5 min |
| GET | `/v1/places/:idOrSlug/images` | 5 min |
| GET | `/v1/search?q&category&page&limit` | 1 min |

`:idOrSlug` accepts either - the bot passes numeric ids because Telegram caps
`callback_data` at 64 bytes, the web app passes slugs so its URLs are readable.

`page` defaults to 1, `limit` to 20, capped at 50. Out-of-range values are a
`bad_request`, not a silent clamp.

### Language

`?lang=uz` wins, then `Accept-Language`, then `DEFAULT_LANG`. An unsupported
language is ignored rather than rejected. Responses carry `Content-Language`
and `Vary: Accept-Language`, so a shared cache can never hand an Uzbek body to
an English client.

A row missing the requested locale falls back to the default locale, then to any
locale present - a half-translated place still renders instead of showing blank.
Supported languages live in `SUPPORTED_LANGS` in `wrangler.toml`.

### Errors

```json
{ "error": { "code": "not_found", "message": "Place 'x' not found" } }
```

`code` is one of `not_found`, `bad_request`, `rate_limited`, `internal`. Switch
on `code`; `message` is for humans and will change. Unexpected failures log the
real error and return a generic message - internal detail leaks schema.

### CORS

`/v1/*` allows any origin. That is correct rather than lazy: the API is public,
read-only, and sends no cookies or credentials, so an allowlist would protect
nothing while breaking every Vercel preview deployment (their subdomains are
generated per branch and cannot be listed in advance). Part 5's write endpoints
are called server-side only and are not covered by this policy.

### Keepalive

`wrangler.toml` registers a cron trigger at 06:00 UTC daily that runs one cheap
query. Supabase's free tier pauses a project after 7 idle days and unpausing is
manual, so this is not optional.

### Tests

```bash
pnpm --filter @place-map/api test
```

Covers language resolution and pagination arithmetic - the two places where a
quiet off-by-one would corrupt every response.

## Part 3 - Images

Each image ends up referenced twice, once per audience:

| Column | Used by | Why |
|---|---|---|
| `storage_path` | web app, native app | Real CDN path, works everywhere |
| `telegram_file_id` | Telegram bot | Telegram serves it from their CDN, costing you nothing |

`telegram_file_id` stays `null` here. The bot fills it on its first send in
Part 4, and every send after that is free.

### ImageKit setup

1. https://imagekit.io - sign up, create the media library.
2. **Developer options -> API keys**, copy into `.env`:
   - URL endpoint -> `IMAGEKIT_URL_ENDPOINT`
   - Public key -> `IMAGEKIT_PUBLIC_KEY`
   - Private key -> `IMAGEKIT_PRIVATE_KEY`
3. If a card wall appears, switch to Cloudinary - only `scripts/src/imagekit.ts`
   changes, nothing else in the repo knows which provider is behind the URL.

### Folder layout

One folder per place, named exactly as the place's `slug`:

```
scripts/images-in/
  cafe-central/
    front.jpg
    interior.jpg
  plov-house/
    hall.jpg
```

`images-in/` is gitignored - source photos are large and do not belong in git.

### Run it

```bash
pnpm --filter @place-map/scripts upload -- --dry-run     # resize + report only
pnpm --filter @place-map/scripts upload                  # for real
pnpm --filter @place-map/scripts upload -- --place cafe-central
pnpm --filter @place-map/scripts upload -- --replace     # re-do a place from scratch
```

Output looks like:

```
cafe-central (place 1) - 2 image(s)
  + front.jpg 3204 KB -> 148 KB (1200x800, q82)
  + interior.jpg 2890 KB -> 131 KB (1200x900, q82)

Uploaded 2, skipped 0.  6094 KB -> 279 KB (95% smaller)
```

### What it guarantees

- **Resized before upload, never after.** Max 1200px wide, WebP, walking a
  quality ladder down from 82 until the file fits 200 KB. On-the-fly
  transformation quotas are the other thing that runs out on a free tier, so
  the stored file is already the file that gets served.
- **EXIF orientation applied.** Phone photos arrive rotated; skipping this is
  how sideways images reach production.
- **Idempotent.** The path is a deterministic function of slug and position
  (`/places/cafe-central/cafe-central-1.webp`), and the script skips anything
  already recorded, so re-running costs nothing and creates no duplicates.

Adding a photo that sorts before an existing one shifts the numbering. Re-run
that place with `--replace` when it happens.

### Verify

```bash
curl "http://localhost:8787/v1/places/cafe-central" | jq '.data.images'
```

The API builds each URL from `IMAGEKIT_URL_ENDPOINT` plus `storage_path`, so
the Worker needs that secret set too (Part 2 already lists it).

---

## Backups

`.github/workflows/backup.yml` dumps the whole database nightly at 03:00 UTC and
keeps 30 days of artifacts. Set it up now, not later - the free tier has no
backups of its own and no undo.

1. Push the repo to GitHub.
2. **Settings -> Secrets and variables -> Actions -> New repository secret**
   - Name: `DATABASE_URL`
   - Value: the **Session Pooler** URI from Supabase (**Project Settings ->
     Database -> Connection string -> Session pooler**).

   Use the pooler, not the direct connection. Supabase's direct database host is
   IPv6-only on the free tier and GitHub's runners have no IPv6, so a direct URI
   fails to resolve with a confusing error.
3. **Actions -> Nightly database backup -> Run workflow** to prove it works
   without waiting a day.

### Restore

```bash
pg_restore --no-owner --no-privileges -d "$DATABASE_URL" place-map.dump
```

## Layout

```
place-map/
├── api/                 # Cloudflare Worker (Hono) - Part 2, bot in Part 4
├── db/
│   ├── migrations/      # numbered .sql, run in order, never edited after running
│   └── seed.sql
├── packages/shared/     # Zod schemas + types shared by every client
├── scripts/             # image upload, backup - Part 3
├── admin/               # CRUD dashboard - Part 5
├── web/                 # public site, Next.js on Vercel - Part 6
└── mobile/              # Expo app (own lockfile, not in the pnpm workspace) - Part 7
```

## Hosting split

Two platforms, on purpose:

| What | Where | Why |
|---|---|---|
| API + Telegram webhook | Cloudflare Workers | No cold starts, 100K req/day free, no card |
| Public web app | Vercel (Hobby) | Free, no card, best Next.js DX |
| Admin dashboard | Vercel or Cloudflare Pages | Static, calls the same API |

The web app is a **client of the API**, not a second backend. Fetch from
`https://<worker>.workers.dev/v1/...` in server components for SEO-friendly
HTML. Do not add Next.js route handlers that query Supabase directly - that
recreates the duplication this whole design exists to avoid, and the native app
could never use it.

Two consequences to plan for:

- **CORS.** The Worker must allow the Vercel origin *and* preview deployments
  (`https://*.vercel.app`). Handled in Part 2.
- **Vercel Hobby is non-commercial only.** Ads, paid listings or a business
  behind this site put you on Pro ($20/mo). If the directory is ever meant to
  earn money, Cloudflare Pages has no such restriction and is also free.

## Hard limits this design works around

| Limit | Value | Mitigation |
|---|---|---|
| Supabase auto-pause | 7 days idle | Worker cron pings the DB daily (Part 2) |
| Supabase DB size | 500 MB | Text only in the DB, never image blobs |
| Supabase egress | 5 GB/mo | Cache-Control + Workers KV; images served by ImageKit |
| Workers requests | 100K/day, hard 429 | Cache headers + KV |
| Workers CPU | 10 ms/request | No heavy work in the request path |
| Image storage | ~3 GB | Resize to WebP 150-200 KB at upload |
| Supabase backups | **none on the free tier** | Nightly `pg_dump` via GitHub Actions |

The limit that actually bites is **image size**, not request count. A 4 MB phone
photo fills any free tier in a week.
