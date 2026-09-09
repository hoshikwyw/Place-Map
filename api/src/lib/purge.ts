import type { Env } from '../types.js'

/**
 * Drops cached responses after a write.
 *
 * Only KV is purged, and that is the whole story: a Worker's own responses are
 * not put in Cloudflare's edge cache automatically, so `Cache-Control` governs
 * browsers and any CDN in front of them, not something we can invalidate from
 * here. KV is the layer that spares Supabase, and it is the layer that would
 * otherwise keep serving a place the admin just edited.
 *
 * Clients may still hold a copy for up to the max-age on the response (5
 * minutes for places and lists). That is a deliberate trade, not an oversight -
 * shortening it would push read traffic straight back onto the free tier.
 */

/** KV lists 1000 keys per call, so a purge of a small site is one round trip. */
async function purgePrefix(env: Env, prefix: string): Promise<number> {
  if (!env.CACHE) return 0

  let cursor: string | undefined
  let removed = 0

  do {
    const listing = await env.CACHE.list({ prefix, cursor, limit: 1000 })
    await Promise.all(listing.keys.map((key) => env.CACHE!.delete(key.name)))
    removed += listing.keys.length
    cursor = listing.list_complete ? undefined : listing.cursor
  } while (cursor)

  return removed
}

async function purge(env: Env, prefixes: string[]): Promise<void> {
  if (!env.CACHE) return

  try {
    const counts = await Promise.all(prefixes.map((prefix) => purgePrefix(env, prefix)))
    const total = counts.reduce((sum, n) => sum + n, 0)
    if (total > 0) console.log(`purged ${total} cache entries`)
  } catch (error) {
    // A stale cache entry expires on its own within minutes; failing the write
    // over it would be worse.
    console.error('cache purge failed', error)
  }
}

/**
 * Editing a category changes the category list *and* every list page rendered
 * under it, so both prefixes go.
 */
export function purgeCategories(env: Env): Promise<void> {
  return purge(env, ['v1:categories:', 'v1:category:'])
}

/**
 * Editing a place invalidates its own entry under both the id and the slug it
 * is addressed by, plus every category page it might appear on. Which page that
 * is depends on sort order and pagination, so the whole prefix goes rather than
 * guessing.
 */
export function purgePlace(env: Env, id: number, slug?: string): Promise<void> {
  const prefixes = [`v1:place:${id}:`, 'v1:category:']
  if (slug) prefixes.push(`v1:place:${slug}:`)
  return purge(env, prefixes)
}
