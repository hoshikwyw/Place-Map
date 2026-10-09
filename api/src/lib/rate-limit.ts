import type { Env } from '../types.js'

/**
 * How often one address may use a write that needs no key.
 *
 * There are two of those now - suggestions and reviews - and they want the
 * same answer to the same question, so the counter lives here rather than
 * being written twice with two slightly different window behaviours.
 *
 * Needs the KV cache binding, which is optional. Without it this returns false
 * and the other defences carry the weight: the honeypot, the length limits,
 * and - for both of these writes - the fact that nothing submitted is visible
 * until an editor says so. A directory this size would rather take a little
 * junk into a moderation queue than refuse a genuine review because a cache
 * is not configured.
 */
export interface Allowance {
  /** How many in the window. */
  perWindow: number
  /** Seconds. The window starts at the first request, not the last. */
  windowSeconds: number
  /** Keeps one kind of write from spending another's allowance. */
  bucket: string
}

export const SUGGESTIONS: Allowance = { perWindow: 5, windowSeconds: 3600, bucket: 'suggest' }

/**
 * Tighter than suggestions. A suggestion is one message to an editor about one
 * thing; five an hour is generous. Reviews arrive one per place, and somebody
 * genuinely reviewing three places in an hour is already unusual.
 */
export const REVIEWS: Allowance = { perWindow: 3, windowSeconds: 3600, bucket: 'review' }

export async function tooMany(env: Env, address: string, allowance: Allowance): Promise<boolean> {
  if (!env.CACHE) return false

  const key = `v1:rate:${allowance.bucket}:${address}`
  try {
    const seen = Number((await env.CACHE.get(key)) ?? 0)
    if (seen >= allowance.perWindow) return true

    // The window starts at the first write and is not extended by later ones,
    // so somebody who writes three in a minute waits an hour, not forever.
    await env.CACHE.put(key, String(seen + 1), { expirationTtl: allowance.windowSeconds })
    return false
  } catch (error) {
    // A cache that is failing must not become a wall in front of the one thing
    // a visitor can contribute.
    console.error('rate limit check failed', error)
    return false
  }
}

/** The caller's address, or a shared bucket when Cloudflare did not say. */
export function addressOf(header: string | undefined): string {
  return header ?? 'unknown'
}
