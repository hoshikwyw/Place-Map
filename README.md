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

## Build parts

- [x] **Part 1** - Repo scaffold + database schema + seed
- [ ] **Part 2** - Read-only API (`/v1/categories`, `/v1/places`, `/v1/search`)
- [ ] **Part 3** - Image pipeline (resize -> ImageKit -> `place_images`)
- [ ] **Part 4** - Telegram bot (webhook, category keyboard, paginated list, place detail)
- [ ] **Part 5** - Write endpoints + admin dashboard (CRUD)
- [ ] **Part 6** - Public web app (Cloudflare Pages)
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

## Layout

```
place-map/
├── api/                 # Cloudflare Worker (Hono) - Part 2, bot in Part 4
├── db/
│   ├── migrations/      # numbered .sql, run in order, never edited after running
│   └── seed.sql
├── scripts/             # image upload, backup - Part 3
├── admin/               # CRUD dashboard - Part 5
├── web/                 # public site - Part 6
└── mobile/              # Expo app - Part 7
```

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
