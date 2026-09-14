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
| Maps | MapLibre GL JS + OpenFreeMap tiles (no key, no account) |
| Images | `next/image` with a custom ImageKit loader |
| i18n | Locale in the path (`/en/...`, `/uz/...`), hand-rolled - two locales need no library |
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
| Styling | StyleSheet with the shared brand tokens (NativeWind needs Babel/Metro/Tailwind config for a dozen colours) |
| Data | TanStack Query with persisted cache for offline |
| Maps | None in-app: Directions hand off to the phone's maps app, so it runs in Expo Go with no native build |
| Builds | EAS Build free tier, Expo Go for development |

### Shared (`packages/shared/`)

Zod schemas and the TypeScript types derived from them - `Place`, `Category`,
`OpeningHours`, the response envelope. Imported by the API, the dashboard, the
web app and the native app, so a schema change breaks the build instead of
breaking production.

### Card-free warnings

- **Cloudflare R2** - requires a payment method to activate. Not used.
- **Google Maps** (`react-native-maps` default, Google Maps JS API) - needs a
  Google Cloud billing account, which needs a card. The website uses MapLibre
  with OSM-derived tiles; the app hands directions to the phone's maps app.
- **Vercel Hobby** - free but non-commercial only. See Hosting split below.

## Build parts

- [x] **Part 1** - Repo scaffold + database schema + seed
- [x] **Part 2** - Read-only API (`/v1/categories`, `/v1/places`, `/v1/search`)
- [x] **Part 3** - Image pipeline (resize -> ImageKit -> `place_images`)
- [x] **Part 4** - Telegram bot (webhook, category keyboard, paginated list, place detail)
- [x] **Part 5a** - Write endpoints (`POST`/`PATCH`/`DELETE`, `X-API-Key`)
- [x] **Part 5b** - Admin dashboard (Next.js CRUD UI)
- [x] **Part 6** - Public web app (Next.js on Vercel)
- [x] **Part 7** - Native app (Expo)

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

## Part 4 - Telegram bot

Lives inside the same Worker as the API, at `POST /webhook/telegram`.

### Screens

```
/start  or  /help
  └─ categories, two per row
       └─ [category] ─ paginated list, 6 per page
            ├─ « Prev   1/4   Next »
            ├─ [place] ─ photo + details + Map / Website
            │              └─ ← Back (to the exact page you left)
            └─ ← Categories

any other text ─ search across every language, one page of results
```

### Deploy

```bash
cd api
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
npx wrangler deploy
```

`TELEGRAM_WEBHOOK_SECRET` is a string you invent, not one Telegram gives you:

```bash
openssl rand -hex 32
```

Then point Telegram at the Worker (needs both values in the root `.env` too):

```bash
pnpm --filter @place-map/scripts webhook -- --url https://place-map-api.YOURNAME.workers.dev
pnpm --filter @place-map/scripts webhook -- --info      # check for delivery errors
pnpm --filter @place-map/scripts webhook -- --delete    # unhook
```

`--info` is the first place to look when the bot goes quiet:
`last_error_message` reports exactly what Telegram saw.

### Local development

Telegram cannot reach `localhost`, so a local bot needs a public tunnel:

```bash
pnpm dev                              # terminal 1
npx cloudflared tunnel --url http://localhost:8787   # terminal 2
pnpm --filter @place-map/scripts webhook -- --url https://<tunnel>.trycloudflare.com
```

Re-point the webhook at the deployed Worker when you are done - the tunnel URL
dies with the process and the bot stays broken until you do.

### How it behaves, and why

**It reads through `/v1`, in-process.** The bot calls the same API the web and
native apps will, so the queries, the language handling and the response shape
exist once. It dispatches into the Hono app directly rather than fetching its
own public URL, because a Worker calling itself over HTTP is billed as a second
request - the same code path, without spending the quota twice.

**Every callback query is answered first.** Until `answerCallbackQuery` lands
the button spins in the client, so it goes out before any lookup.

**Navigation replaces the message.** Paging is a true in-place edit. Telegram
cannot turn a text message into a photo message, so opening a place (and going
back) deletes and re-sends instead. The chat stays one screen deep either way.

**The webhook always answers 200.** A non-200 makes Telegram redeliver the same
update, which burns request quota and rarely fixes anything. Updates are handled
after the response via `waitUntil`, so a slow first image upload cannot time the
webhook out.

**The secret header is checked before the body is read.** The webhook URL is
effectively public; `X-Telegram-Bot-Api-Secret-Token` is the only thing
separating a real update from anyone who guesses the path. Anything else gets a
401.

### `callback_data`

Telegram caps it at **64 bytes** and silently drops the whole keyboard if one
button is over, so only numeric ids travel in it:

| Action | Format | Example |
|---|---|---|
| Categories | `home` | `home` |
| Category page | `c:<id>:<page>` | `c:3:2` |
| Place | `p:<id>:<catId>:<page>` | `p:42:3:2` |
| Page counter | `nop` | `nop` |

The place button carries the list page it was opened from - a callback query
says nothing about how the user got there, and without it "Back" from page 4
would dump them on page 1.

This cap is also why **search results have no pager**: the query itself would
have to fit in those 64 bytes. Instead the bot shows one page and says how many
matches it did not show.

### Images cost nothing after the first send

`place_images.telegram_file_id` starts `null`. The first time the bot sends a
photo it passes the ImageKit URL, reads the `file_id` off Telegram's response
and writes it back. Every later send passes that id, and Telegram serves the
image from their own CDN - your ImageKit bandwidth is never touched again.

That column is deliberately absent from `/v1` responses. A `file_id` is
meaningless to the web and native apps, and exposing it would leak a Telegram
detail into every client.

### Language

The bot honours the Telegram client's own language setting when it is one of
`SUPPORTED_LANGS`, so an Uzbek user gets Uzbek place names without touching a
setting. The bot's own wording lives in `api/src/bot/strings.ts` - add a locale
there whenever you add one to `SUPPORTED_LANGS`, or half the screen stays
English.

### Tests

```bash
pnpm --filter @place-map/api test
```

Covers the `callback_data` codec (including the 64-byte ceiling at implausible
ids), pager edge cases, and the opening-hours grouping.

## Part 5a - Write endpoints

Same resource paths as the read API, write methods, all behind one API key.

```bash
cd api
npx wrangler secret put ADMIN_API_KEY     # invent one: openssl rand -hex 32
npx wrangler deploy
```

Also add it to the root `.env` so local tooling can reach the write endpoints.

### Endpoints

| Method | Path | Notes |
|---|---|---|
| POST | `/v1/categories` | 201 with the created row |
| PATCH | `/v1/categories/:id` | partial |
| DELETE | `/v1/categories/:id` | refused while it still holds places |
| POST | `/v1/places` | 201 |
| PATCH | `/v1/places/:id` | partial |
| DELETE | `/v1/places/:id` | image rows cascade |
| POST | `/v1/places/:id/images` | records an image already on the CDN |
| PATCH | `/v1/places/:id/images/reorder` | `{ "image_ids": [3, 1, 2] }` |
| DELETE | `/v1/images/:id` | |

```bash
curl -X POST http://localhost:8787/v1/places \
  -H "X-API-Key: $ADMIN_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"category_id":1,"slug":"new-cafe","name":{"en":"New Cafe","uz":"Yangi kafe"}}'
```

### They return raw database rows

Unlike the read API, a write returns the row exactly as stored - `name` and
`description` still jsonb, `lat`/`lng` still separate columns. An editor needs
every translation at once; a reader needs exactly one. The dashboard binds its
forms to this shape.

### Auth

`X-API-Key`, compared in constant time. Three deliberate behaviours:

- A missing `ADMIN_API_KEY` **disables writes** (500) rather than allowing them.
  An unset secret must never mean "allow".
- A bad key gets `404 Not found` in the body with a 401 status - it confirms
  nothing about whether the route exists.
- The key never touches a browser. The dashboard keeps it server-side and
  proxies writes, which is why CORS on `/v1/*` allows only GET and OPTIONS: even
  with the key, a browser cannot call these directly.

### Validation

Shared Zod schemas (`packages/shared/src/write.ts`), so the dashboard's forms
and the API agree by construction. Beyond field types:

- **`lat` and `lng` must arrive together.** Half a coordinate is worse than
  none - the map would place the pin on the equator.
- **`PATCH {}` is rejected.** Defaults live only on the create schemas; an
  update built by making a create schema partial would keep those defaults and
  silently reset `sort_order` and `is_active` on every empty patch.
- **Slugs are `lowercase-with-hyphens`.** They end up in public URLs.
- **Opening times must close after they open**, and split shifts are allowed.
- **Reordering must list exactly the images the place owns** - a partial list
  would leave some rows with stale sort values and no error to show for it.

Constraint failures come back as readable messages: a duplicate slug is
`"That slug is already taken"`, not a Postgres error string.

### Cache invalidation

Each write purges the KV entries it affects: a place by both its id and its
slug (including the previous slug on a rename), plus every category list page,
since which page a place lands on depends on sort order.

Client-side copies are a different matter. `Cache-Control` on read responses is
honoured by browsers and the native app's HTTP cache, and those cannot be purged
from the server - an edit can take up to `max-age` (5 minutes for places and
lists) to reach a client that already fetched it. Shortening that would push
read traffic straight back onto the database.

### Deleting a place leaves its files

`place_images` rows cascade, but the images stay on ImageKit. That is
deliberate: an accidental delete should be recoverable from the nightly dump
plus an untouched CDN. Clearing orphaned files is a separate, manual job.

## Part 5b - Admin dashboard

Next.js app in `admin/`. Sign in, edit categories and places, upload photos.

### Run it

```bash
cp admin/.env.example admin/.env.local   # then fill it in
pnpm --filter @place-map/admin dev       # http://localhost:3001
```

| Variable | Value |
|---|---|
| `PLACE_MAP_API_URL` | `http://localhost:8787` in dev, the Worker URL in production |
| `ADMIN_API_KEY` | must match the Worker's `ADMIN_API_KEY` secret |
| `ADMIN_PASSWORD` | the password you type to sign in |
| `SESSION_SECRET` | signs the session cookie - `openssl rand -hex 32` |
| `IMAGEKIT_URL_ENDPOINT`, `IMAGEKIT_PRIVATE_KEY` | needed for photo upload |
| `LOCALES` | which language boxes the forms show, default `en,uz` |

Run the API alongside it - the dashboard has no database access of its own.

### Deploy to Vercel

1. Push to GitHub, then **New Project** and import the repo.
2. **Root Directory: `admin`.** It is a pnpm workspace, so Vercel must build
   from the repo root with this as the app - setting the root directory is what
   tells it that.
3. Add every variable above under **Settings -> Environment Variables**.
4. Deploy.

The dashboard is not linked from anywhere and `robots` is set to `noindex`, but
it is still a public URL protected only by the password. Use a long one.

### Screens

```
/login                     password -> httpOnly session cookie, 12 hours
/places                    search + category filter + pagination
/places/new                create
/places/[id]               edit, delete, and manage photos
/categories                list
/categories/new            create
/categories/[id]           edit, delete
```

Both list screens flag rows that are missing a translation or are hidden from
the public - neither is visible from the public site, so the dashboard is the
only place they can surface.

### It never holds the API key

Reads happen in server components, writes in server actions. `ADMIN_API_KEY`
and `IMAGEKIT_PRIVATE_KEY` are attached on the server and never reach the
browser; `src/lib/env.ts` and `src/lib/api.ts` import `server-only`, so an
accidental client import is a build error rather than a leaked key.

This is what makes the Worker's CORS policy load-bearing rather than
decorative: `/v1/*` allows only GET and OPTIONS, so even a leaked key could not
be spent from a browser.

**Server actions rather than route handlers.** The plan called for a proxy route
plus TanStack Query. An action needs no endpoint of its own, no client fetch
layer and no manual cache invalidation, so that layer is gone. Each action
re-checks the session - a page guard protects rendering, not the POST the form
submits to.

### Auth

One operator, one password, a cookie carrying an expiry and an HMAC over it.
No user table and no Supabase Auth: accounts, resets and sessions would be more
code and more attack surface than the thing being protected.

The password is compared in constant time. Changing `SESSION_SECRET` signs
everyone out immediately.

### Reads go through `/v1/admin/*`

Not the public routes. Two differences matter: rows arrive raw, so an editor
sees every translation at once instead of one resolved language, and inactive
rows are included - the public API hides them, and something you cannot see is
something you cannot publish again.

### Photo upload

The browser posts the original file to a server action, which resizes to 1200px
WebP under 200 KB, uploads to ImageKit, and records the path through the API.

Same size gate as the CLI in Part 3, on purpose: image size is the free-tier
limit that actually bites, and a second upload path that skipped it would
quietly undo the first. EXIF orientation is applied here too, or phone photos
arrive sideways.

Order is editable because it is meaningful - the first photo is the one the bot
sends and the one the web app uses as a thumbnail. Photos already cached on
Telegram are marked as such.

Deleting a photo removes the row and leaves the file on ImageKit, so a misclick
is recoverable.

### Opening hours are typed, not picked

One text box per day: `09:00-18:00`, or `10:00-14:00, 16:00-22:00` for a split
shift, blank for closed. Faster than four dropdowns per day, and a malformed
entry comes back as a message naming the day.

## Part 6 - Public web app

Next.js app in `web/`. Reads the public `/v1` API and nothing else.

### Run it

```bash
cp web/.env.example web/.env.local
pnpm dev                                  # API on :8787, in one terminal
pnpm --filter @place-map/web dev          # site on :3000, in another
```

| Variable | Value |
|---|---|
| `PLACE_MAP_API_URL` | `http://localhost:8787` in dev, the Worker URL in production |
| `SITE_URL` | your public origin - used for canonical links and the sitemap |
| `TIMEZONE` | the places' zone, default `Asia/Tashkent` |
| `NEXT_PUBLIC_MAP_STYLE` | optional MapLibre style URL; defaults to OpenFreeMap |

### Deploy to Vercel

Same as the dashboard: **New Project**, import the repo, **Root Directory:
`web`**, add the variables, deploy. It is a second Vercel project alongside the
dashboard.

`next build` does not call the API. Pages render on their first request and are
cached from then on, so a deploy succeeds even while the Worker is down or not
deployed yet.

### Pages

```
/                      redirects to /en or /uz from the browser's language
/{lang}                categories + search
/{lang}/c/{slug}       a category: map of its places, then a paginated grid
/{lang}/p/{slug}       a place: photos, hours, open-now, map, directions
/{lang}/search?q=      results across every language
/sitemap.xml           every place in every language, with hreflang
```

### Languages are in the URL

`/en/p/cafe-central` and `/uz/p/cafe-central` are separate pages that name each
other as translations. A cookie would have given one URL per place, so only one
language could ever be indexed, and a shared link would open in whatever
language the recipient last used.

Locales are defined in `web/src/lib/i18n.ts`, not an env var: each one needs a
full set of UI strings, so adding one without translating would ship a half-
English site. Keep the list in step with the API's `SUPPORTED_LANGS`.

### Caching, and why an edit takes up to five minutes

Every API call runs on the server through Next's data cache for 5 minutes (an
hour for categories, a minute for search). A thousand visitors to one place page
cost the Worker one request per five minutes, not a thousand - that is what
keeps a busy site inside the 100K/day request budget.

The language is passed as `?lang=` rather than `Accept-Language`, because the
data cache keys on the URL; a header-keyed response could serve one language's
page to another.

### "Open now" runs in the browser

Pages are cached for minutes; an "Open now" baked into HTML at 17:58 would still
say open at 18:03. The badge is computed after the page loads, and re-checked
every minute, in the **place's** time zone - the server runs in UTC and the
visitor may be anywhere, and both are wrong for "is this cafe in Tashkent open".

The grouping and open/closed logic live in `packages/shared/src/hours.ts`, now
also used by the bot, so the site, the bot and the app cannot disagree.

### Maps are free, with no key

MapLibre GL renders OpenFreeMap vector tiles: no API key, no account, no card.
Google Maps needs a billing account; raw openstreetmap.org tiles forbid
production use. The ~200 KB library loads only on pages with a map, after the
page is interactive. Scroll-wheel zoom needs Ctrl/Cmd so the map never traps
page scrolling.

The **Directions** button opens Google Maps by URL, which needs no key.

### SEO

- Per-page titles and descriptions; the place's first photo as its Open Graph image
- `canonical` plus `hreflang` alternates on every page, and in the sitemap
- schema.org `LocalBusiness` data on place pages - address, coordinates and
  opening hours in a form search engines can show directly in results
- Search result pages are `noindex`: thin and near-infinite, they would only
  compete with the place pages they link to

### Images

Served straight from ImageKit. They were already resized to 1200px WebP under
200 KB on the way in (Part 3), so running them through Vercel's image optimiser
would spend a metered quota re-compressing small files. Card images are
lazy-loaded; the place page's cover image is fetched first.

### 404 and error pages

The layout that renders `<html lang>` lives in `[lang]/layout.tsx`, so a
not-found or error that escapes it needs a boundary *above* it:

| File | Handles |
|---|---|
| `app/layout.tsx` | Pass-through (returns `children`). Exists only so `app/` can hold the two files below. |
| `app/not-found.tsx` | Full-page-load 404s, including unknown locales like `/foo.bar`. Locale comes from the `x-locale` header the middleware sets. |
| `[lang]/not-found.tsx` | 404s during client-side navigation. Same content, via `components/not-found-content.tsx`. |
| `app/global-error.tsx` | A full page load that throws - in practice, the API being down. Renders its own `<html>` and nothing that could fail again. |
| `[lang]/error.tsx` | Errors during client-side navigation, inside the site layout with a retry button. |

Every page also runs `requireLocale()` before calling the API. The middleware
skips paths containing a dot, so `/foo.bar/c/cafes` reaches a page with
`lang = "foo.bar"`, and Next renders pages alongside their layout - without the
guard, the page would call the API with a nonsense language before the 404 won.

**Known limitation.** A full-page-load 404 arrives with the correct 404 status,
`noindex`, and a localized message, but wrapped in Next's minimal error
document: the server HTML carries no site header, and the rest of the page is
filled in by the browser. Search engines are unaffected - they drop 404s either
way - but a visitor without JavaScript sees a bare message. Worth revisiting on
the next Next.js upgrade.

## Part 7 - Native app

Expo (SDK 57) app in `mobile/`. Categories, paginated place lists, search,
and a place screen with photos, "open now", hours, and Directions / Call /
Website buttons. English and Uzbek, following the phone's language, with an
in-app switch.

### Run it on your phone

```bash
cd mobile
npm install                    # npm, not pnpm - see "Outside the workspace" below
cp .env.example .env           # set EXPO_PUBLIC_API_URL
npx expo start
```

Scan the QR code with **Expo Go** (App Store / Play Store). No Xcode, Android
Studio or developer account needed.

**`localhost` does not work on a phone** - it means the phone itself. Point
`EXPO_PUBLIC_API_URL` at the deployed Worker, or at your computer's LAN address
while running the API locally (`http://192.168.x.x:8787`, same Wi-Fi).
`EXPO_PUBLIC_*` values are baked in when Expo bundles, so restart
`expo start` after changing `.env`, and never put a secret there.

### Check it without a phone

```bash
npm run typecheck      # the app, plus the shared package it imports
npm run check:bundle   # a real Android release bundle via Metro
```

`check:bundle` is the one that matters: it resolves every import exactly as a
release build would, so a broken path to `@place-map/shared` fails here rather
than on someone's phone.

### Screens

```
/                  categories + search box        (language switch in the header)
/category/[slug]   places, loads more as you scroll, pull to refresh
/place/[slug]      photos, open now, directions / call / website, hours
/search?q=         results, same list component as a category
```

### Outside the workspace, sharing code anyway

`mobile/` has its own `package-lock.json` and is deliberately not in
`pnpm-workspace.yaml`: pnpm links packages through symlinks into a shared
store, and Metro following those is a reliable source of "unable to resolve
module" errors. Expo only auto-configures monorepos for workspace members, so
`metro.config.js` does it by hand, narrowly:

- `@place-map/shared` resolves straight to its TypeScript source - the same
  types, and the same `groupHours` / `isOpenAt` the bot and the website use, so
  the three can never disagree about whether a place is open.
- Packages *that source* imports (zod) resolve from the app's own
  `node_modules`. Metro never walks into pnpm's store, and the bundle contains
  exactly one zod - verified from the release bundle's source map.

### Works offline

Every response is saved to the phone for a day and restored on launch, so the
app opens with content and keeps working on a plane or underground. When a
refresh fails, cached content stays on screen under a "could not refresh"
notice rather than being replaced by an error. Photos use a disk cache too.

The saved cache is discarded when the app version changes, so data shaped for
an older build is never read by a newer one - bump `version` in `app.json` when
the API's response shape changes.

### Directions open the phone's maps app

There is no map inside the app, on purpose. An embedded map means Google Maps
(needs a billing account, which needs a card) or MapLibre (native code, so it
cannot run in Expo Go - every tester would need a custom build). The phone's
own maps app is also better at directions. On Android the `geo:` link lets the
user pick Google Maps, Yandex or 2GIS; iOS opens Apple Maps; a web link is the
fallback.

An in-app map can come later via an EAS development build and
`@maplibre/maplibre-react-native` with the same tiles as the website.

### Language and time

The app starts in the phone's language when it is English or Uzbek, and
remembers a switch made in the header. Place names arrive already translated;
the app's own wording lives in `src/i18n.tsx`, kept in step with the website.

"Open now" is judged in `EXPO_PUBLIC_TIME_ZONE` (default `Asia/Tashkent`), not
the phone's zone, and re-checked every minute.

### Shipping it

Expo Go is for development. For the stores, use EAS Build (free tier, queued
builds) - `npx eas build` - plus a Google Play developer account ($25 once) and
an Apple Developer account ($99/year). Those two fees are the first costs in the
whole project that cannot be avoided, and only if you publish to the stores.

### Files from the Expo template

`create-expo-app` added four files that are not part of this project's design:

- `LICENSE` - Expo's own MIT license ("Copyright 650 Industries"). Delete or
  replace it, or the app appears to be licensed as Expo's code.
- `AGENTS.md`, `CLAUDE.md`, `.claude/settings.json` - guidance for AI coding
  assistants working inside `mobile/`. Harmless; keep or delete as you prefer.

## Going live

Order matters: everything reads through the API, and the API reads the
database. Each step has a check - do not move on until it passes.

### 1. Database

Supabase dashboard -> **SQL Editor**, run in order:

```
db/migrations/0001_init.sql
db/migrations/0002_search.sql
db/seed.sql
```

**Check.** In the SQL Editor:

```sql
select p.slug, p.name->>'en' as name_en, c.slug as category
from places p join categories c on c.id = p.category_id;
```

Three rows. If instead you get *"relation does not exist"*, 0001 did not run.

### 2. The API's secrets

The Worker needs the **service_role** key, not the anon key. RLS is on with no
policies, so the anon key reads nothing - by design, so a leaked anon key in the
web app is harmless.

Supabase -> **Project Settings -> API -> service_role -> reveal**.

```bash
cd api
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put IMAGEKIT_URL_ENDPOINT
npx wrangler secret put ADMIN_API_KEY          # openssl rand -hex 32
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET # openssl rand -hex 32
npx wrangler deploy
```

**Check.**

```bash
curl https://place-map-api.YOURNAME.workers.dev/v1/health
curl https://place-map-api.YOURNAME.workers.dev/v1/categories
```

Health must report `"database": "ok"`. Categories must list five. A healthy API
with an empty category list means step 1 ran but the seed did not.

### 3. The bot

```bash
pnpm --filter @place-map/scripts webhook -- --url https://place-map-api.YOURNAME.workers.dev
```

**Check.** Send `/start` in Telegram - the category keyboard appears. If it is
silent, `--info` prints Telegram's own `last_error_message`.

### 4. Images

Fill the ImageKit keys into `.env`, put photos in `scripts/images-in/<slug>/`:

```bash
pnpm --filter @place-map/scripts upload -- --dry-run
pnpm --filter @place-map/scripts upload
```

**Check.** `curl .../v1/places/cafe-central | jq '.data.images'` returns URLs
that open in a browser.

### 5. Admin dashboard, then the website

Both are Vercel projects from this repo, and both need **Root Directory** set -
`admin` and `web` - because this is a pnpm workspace. Environment variables are
listed in each part's section above.

**Check.** Sign in to the dashboard, change a place, and confirm the change
appears on the site within five minutes (that is the cache window, not a bug).

### 6. Backups and uptime

Do not leave these for later - see **Operations** below.

### 7. The app

```bash
cd mobile && npm install && cp .env.example .env   # EXPO_PUBLIC_API_URL
npx expo start
```

**Check.** Scan with Expo Go; categories load on the phone.

---

## Operations

| Task | How | When |
|---|---|---|
| Keep Supabase awake | Worker cron, already deployed | Daily, automatic |
| Backups | GitHub Actions `pg_dump` | Nightly, automatic |
| Uptime | UptimeRobot on `/v1/health` | Every 5 minutes |
| Quota watch | Cloudflare and Supabase dashboards | Weekly |

### Uptime monitoring

https://uptimerobot.com - free, no card. Add an **HTTP(s)** monitor for
`https://place-map-api.YOURNAME.workers.dev/v1/health`, interval 5 minutes,
alert by email.

`/v1/health` returns **503** when the Worker cannot reach Postgres, so the
monitor catches a paused or broken database rather than only a dead Worker.

### What actually goes wrong, and what it looks like

| Symptom | Cause | Fix |
|---|---|---|
| Everything 503s after a quiet week | Supabase paused after 7 idle days | Unpause in the dashboard; check the Worker's cron is still deployed (`npx wrangler deployments list`) |
| API returns 429 | Past 100K Worker requests/day | Raise `max-age` on list endpoints; check for a loop hammering the API |
| Images stop loading | ImageKit bandwidth exhausted | The bot is unaffected (Telegram serves its own copies); resize harder, or move the CDN - only `scripts/src/imagekit.ts` knows the provider |
| Supabase egress warning | Responses not being cached | Turn on the KV cache (Part 2) if you have not |
| Admin edit not visible | Cache window | Wait five minutes. Still missing after that: check the Worker's logs, `npx wrangler tail` |

### Weekly, two minutes

- Cloudflare dashboard: requests per day against 100K.
- Supabase dashboard: database size against 500 MB, egress against 5 GB.
- GitHub **Actions**: last night's backup is green, and the artifact is there.

The limit that bites first is **image storage**, not requests - which is why
nothing reaches the CDN without passing the 200 KB gate in Part 3.

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

## Brand, icons and mascot

**One source of truth:** `packages/shared/src/brand.ts` holds every colour
(light and dark), the mascot's colours, the corner radii and the typeface.

```bash
pnpm --filter @place-map/scripts brand
```

That one command renders the brand everywhere it lives:

| Output | Used by |
|---|---|
| `web/src/app/brand.css`, `admin/src/app/brand.css` | The website and dashboard - colours and radii as CSS variables, light and dark |
| `web/src/app/icon.svg`, `favicon.ico`, `apple-icon.png` | Website tab, bookmarks, iPhone home screen |
| `admin/src/app/...` | The same icons on warm ink, so the dashboard's tab is easy to tell apart |
| `web/public/mascot.svg`, `admin/public/mascot.svg`, `mobile/assets/mascot.png` | The mascot on welcome, empty, not-found and error screens |
| `mobile/assets/icon.png`, `android-icon-*.png`, `splash-icon.png` | App icon, Android adaptive icon (kept inside the launcher safe zone), launch screen |

The app imports the tokens directly (`mobile/src/theme.ts`), so it needs no
generated file. Edit `brand.ts`, run the command, and the icons, website,
dashboard and app change together. Never edit the generated CSS by hand.

### The look: minimalist and cute

- **Warm neutrals** - a cream background and warm brown-grey text instead of
  cold grey.
- **Teal for anything you can press** - buttons, links, focus rings, "open
  now". It passes contrast with white text; coral does not at button sizes.
- **Coral, the mascot's colour, as the soft accent** - tinted chips, card
  placeholders, "closed now", destructive actions.
- **Round everything** - 20 px cards, pill buttons and inputs, hairline borders
  instead of shadows.
- **Nunito** on all three surfaces, heavy weights for headings. The web apps
  self-host it at build time; the app bundles only the four weights it uses.
- **The mascot appears sparingly** - where a screen needs warmth, never as
  decoration on a working screen.

Light and dark mode both follow the operating system setting.

### The mascot

The brand's map pin with a Sagittarius personality: a coral body with a wide
grin (the sign's optimism), the Archer's golden arrow pointing up and to the
right like the ♐ glyph ("let's go and find somewhere"), and a flame tuft for
the fire element.

**At 16 px it is simplified** to the pin and its eyes - the arrow and flame turn
to noise at that size - so `favicon.ico` carries a simpler 16 px image
alongside the full character at 32 and 48 px.

## Layout

```
place-map/
├── api/                 # Cloudflare Worker: /v1 API + Telegram webhook
├── db/
│   ├── migrations/      # numbered .sql, run in order, never edited after running
│   └── seed.sql
├── packages/shared/     # Zod schemas + types shared by every client
├── scripts/             # image upload, backup - Part 3
├── admin/               # CRUD dashboard, Next.js on Vercel
├── web/                 # public site, Next.js on Vercel - Part 6
└── mobile/              # Expo app (own lockfile, not in the pnpm workspace)
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
| Workers requests | 100K/day, hard 429 | Client cache headers; the bot reads the API in-process rather than over HTTP |
| Workers CPU | 10 ms/request | No heavy work in the request path |
| Image storage | ~3 GB | Resize to WebP 150-200 KB at upload |
| Supabase backups | **none on the free tier** | Nightly `pg_dump` via GitHub Actions |

The limit that actually bites is **image size**, not request count. A 4 MB phone
photo fills any free tier in a week.
