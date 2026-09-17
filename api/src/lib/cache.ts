import type { Env } from '../types.js'

/**
 * Second cache layer behind the edge's Cache-Control. The edge handles repeat
 * requests for the same URL; this handles the same data requested through
 * different URLs, and survives edge evictions. Purely optional - if the CACHE
 * binding is not configured, every call falls straight through to Supabase.
 */

/** KV rejects a TTL under 60 seconds. */
const MIN_TTL = 60

export async function cached<T>(
  env: Env,
  key: string,
  ttlSeconds: number,
  produce: () => Promise<T>,
): Promise<T> {
  if (!env.CACHE) return produce()

  try {
    const hit = await env.CACHE.get<T>(key, 'json')
    if (hit !== null) return hit
  } catch {
    // A cache read must never fail a request.
  }

  const value = await produce()

  try {
    await env.CACHE.put(key, JSON.stringify(value), {
      expirationTtl: Math.max(MIN_TTL, ttlSeconds),
    })
  } catch {
    // Same for writes - the response is already correct.
  }

  return value
}

/** Cache keys are versioned so Part 5's writes can invalidate a whole prefix. */
export const cacheKey = {
  categories: (lang: string) => `v1:categories:${lang}`,
  allPlaces: (lang: string, page: number, limit: number) => `v1:places:${lang}:${page}:${limit}`,
  categoryPlaces: (slug: string, lang: string, page: number, limit: number) =>
    `v1:category:${slug}:${lang}:${page}:${limit}`,
  place: (idOrSlug: string, lang: string) => `v1:place:${idOrSlug}:${lang}`,
  placeImages: (id: number) => `v1:place:${id}:images`,
  // Under v1:categories: so a category write purges it with the rest.
  assistantCategories: 'v1:categories:all-languages',
}
