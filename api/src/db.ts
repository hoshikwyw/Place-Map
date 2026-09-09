import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Env } from './types.js'

/**
 * Workers cannot hold a TCP connection pool between requests, so this talks to
 * Postgres over PostgREST (HTTP) rather than the wire protocol.
 *
 * The service_role key bypasses RLS. That is deliberate: RLS is enabled with no
 * policies, so the anon key reads nothing and every read is forced through this
 * API. The service_role key must never leave the Worker.
 *
 * A client is created per request - Workers isolate requests, and reusing one
 * across them risks leaking state between callers.
 */
export function db(env: Env): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'X-Client-Info': 'place-map-api' } },
  })
}

/** Columns needed to build a Category response. */
export const CATEGORY_COLUMNS = 'id, slug, name, icon'

/** Columns needed to build a Place response, with its category and images. */
export const PLACE_COLUMNS = `
  id, slug, name, description, address, lat, lng, phone, website, opening_hours,
  category:categories!inner ( ${CATEGORY_COLUMNS} ),
  images:place_images ( storage_path, width, height, sort_order )
`
