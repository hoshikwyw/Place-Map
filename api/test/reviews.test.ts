import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { REVIEW_COMMENT_MAX, ratingBreakdown } from '@place-map/shared'
import worker from '../src/index'
import type { Env } from '../src/types'

/**
 * Reviews.
 *
 * The riskiest thing in the API: a stranger writes words that are meant to
 * appear under a name, on a page about a real business. Nearly all of this is
 * about the one rule that makes that safe - nothing is visible until an editor
 * says so - and about the endpoint giving away nothing on the way.
 */

const env = {
  ADMIN_API_KEY: 'correct-horse-battery-staple',
  DEFAULT_LANG: 'en',
  SUPPORTED_LANGS: 'en,my',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'unused-in-these-tests',
  IMAGEKIT_URL_ENDPOINT: 'https://ik.example/x',
} as Env

const ctx = { waitUntil() {}, passThroughOnException() {} } as unknown as ExecutionContext

/** Rows the endpoint tried to insert, and every PostgREST URL it asked for. */
let inserted: Record<string, unknown>[] = []
let asked: string[] = []
/** Set to make the place lookup find nothing. */
let placeExists = true

beforeEach(() => {
  inserted = []
  asked = []
  placeExists = true

  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input))
    asked.push(url.pathname + url.search)
    const method = init?.method ?? 'GET'

    if (url.pathname === '/rest/v1/places') {
      const body = placeExists ? [{ id: 12, slug: 'cafe-central' }] : []
      return new Response(JSON.stringify(body), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (url.pathname === '/rest/v1/reviews') {
      if (method !== 'GET') {
        inserted.push(JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>)
      }
      return new Response('[]', { status: 201, headers: { 'Content-Type': 'application/json' } })
    }

    throw new Error(`unexpected request to ${url.pathname}`)
  })
})

afterEach(() => vi.unstubAllGlobals())

function memoryCache() {
  const store = new Map<string, string>()
  return {
    async get(key: string) {
      return store.get(key) ?? null
    },
    async put(key: string, value: string) {
      store.set(key, value)
    },
    async delete(key: string) {
      store.delete(key)
    },
    async list() {
      return { keys: [], list_complete: true }
    },
  } as unknown as KVNamespace
}

function review(body: unknown, headers: Record<string, string> = {}, override: Partial<Env> = {}) {
  return worker.fetch(
    new Request('https://api.test/v1/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
    { ...env, ...override } as Env,
    ctx,
  )
}

const FIVE_STARS = { place_id: 12, rating: 5, comment: 'Good tea, opens early.', author: 'Ma Thida' }

describe('leaving a review', () => {
  it('is accepted with no API key at all', async () => {
    const res = await review(FIVE_STARS)
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ data: { received: true } })
  })

  it('is stored unpublished, so nobody else can see it yet', async () => {
    // The single most important line in this feature.
    await review(FIVE_STARS)
    expect(inserted).toHaveLength(1)
    expect(inserted[0]).toMatchObject({ is_published: false })
  })

  it('stores the stars, the words and the name', async () => {
    await review(FIVE_STARS)
    expect(inserted[0]).toMatchObject({
      place_id: 12,
      rating: 5,
      comment: 'Good tea, opens early.',
      author: 'Ma Thida',
    })
  })

  it('accepts a star with no words, which is still a review', async () => {
    const res = await review({ place_id: 12, rating: 4 })
    expect(res.status).toBe(201)
    expect(inserted[0]).toMatchObject({ rating: 4, comment: null, author: null })
  })

  it('tells the writer nothing about the row it stored', async () => {
    const res = await review(FIVE_STARS)
    const body = (await res.json()) as { data: Record<string, unknown> }
    expect(Object.keys(body.data)).toEqual(['received'])
  })

  it('is never cached', async () => {
    expect((await review(FIVE_STARS)).headers.get('Cache-Control')).toContain('no-store')
  })

  it('checks the place is real before storing anything', async () => {
    placeExists = false
    const res = await review(FIVE_STARS)
    expect(res.status).toBe(404)
    expect(inserted).toHaveLength(0)
  })

  it('will not take a review of a hidden place', async () => {
    // A review of something nobody can see would sit in the queue looking
    // real, with no way for an editor to tell what it was about.
    await review(FIVE_STARS)
    expect(asked.some((url) => url.includes('is_active=eq.true'))).toBe(true)
  })
})

describe('what it refuses', () => {
  const cases: [name: string, body: unknown][] = [
    ['no rating at all', { place_id: 12 }],
    ['zero stars', { place_id: 12, rating: 0 }],
    ['six stars', { place_id: 12, rating: 6 }],
    ['half a star', { place_id: 12, rating: 4.5 }],
    ['a rating that is a string', { place_id: 12, rating: '5' }],
    ['no place', { rating: 5 }],
    ['a place id of zero', { place_id: 0, rating: 5 }],
    ['a negative place id', { place_id: -1, rating: 5 }],
  ]

  for (const [name, body] of cases) {
    it(`refuses ${name}`, async () => {
      const res = await review(body)
      expect(res.status).toBe(400)
      expect(inserted).toHaveLength(0)
    })
  }

  it('refuses a comment longer than anybody will read', async () => {
    const res = await review({ ...FIVE_STARS, comment: 'x'.repeat(REVIEW_COMMENT_MAX + 1) })
    expect(res.status).toBe(400)
    expect(inserted).toHaveLength(0)
  })

  it('refuses a body that is not JSON', async () => {
    expect((await review('not json')).status).toBe(400)
  })

  it('cannot be used to publish a review directly', async () => {
    // The obvious attack: ask nicely.
    await review({ ...FIVE_STARS, is_published: true })
    expect(inserted[0]).toMatchObject({ is_published: false })
  })
})

describe('the honeypot', () => {
  it('answers a filled one as if it worked, and stores nothing', async () => {
    const res = await review({ ...FIVE_STARS, website: 'http://spam.example' })
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ data: { received: true } })
    expect(inserted).toHaveLength(0)
  })

  it('is indistinguishable from a review that was stored', async () => {
    // Same status, same body, so a script cannot learn which of its requests
    // got through.
    const spam = await review({ ...FIVE_STARS, website: 'x' })
    const real = await review(FIVE_STARS)
    expect(spam.status).toBe(real.status)
    expect(await spam.json()).toEqual(await real.json())
  })
})

describe('the rate limit', () => {
  const from = (address: string) => ({ 'CF-Connecting-IP': address })

  it('allows a few, then asks the writer to wait', async () => {
    const CACHE = memoryCache()
    for (let i = 0; i < 3; i += 1) {
      expect((await review(FIVE_STARS, from('203.0.113.7'), { CACHE })).status, `review ${i + 1}`).toBe(201)
    }
    expect((await review(FIVE_STARS, from('203.0.113.7'), { CACHE })).status).toBe(429)
    expect(inserted).toHaveLength(3)
  })

  it('counts each address on its own', async () => {
    const CACHE = memoryCache()
    for (let i = 0; i < 3; i += 1) await review(FIVE_STARS, from('203.0.113.7'), { CACHE })
    expect((await review(FIVE_STARS, from('198.51.100.4'), { CACHE })).status).toBe(201)
  })

  it('does not spend a suggestion allowance on reviews', async () => {
    // Separate buckets: somebody who sent five suggestions can still review.
    const CACHE = memoryCache()
    for (let i = 0; i < 5; i += 1) {
      await worker.fetch(
        new Request('https://api.test/v1/suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...from('203.0.113.7') },
          body: JSON.stringify({ kind: 'new_place', name: 'X', note: 'Somewhere worth adding.' }),
        }),
        { ...env, CACHE } as Env,
        ctx,
      )
    }
    expect((await review(FIVE_STARS, from('203.0.113.7'), { CACHE })).status).toBe(201)
  })

  it('accepts reviews when no cache is configured, rather than refusing them', async () => {
    for (let i = 0; i < 6; i += 1) {
      expect((await review(FIVE_STARS, from('203.0.113.7'))).status).toBe(201)
    }
  })
})

describe('the moderation queue', () => {
  const KEY = { 'X-API-Key': env.ADMIN_API_KEY }

  const call = (path: string, method = 'GET', headers: Record<string, string> = {}, body?: string) =>
    worker.fetch(
      new Request(`https://api.test${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body,
      }),
      env,
      ctx,
    )

  it('is not readable without the key', async () => {
    expect((await call('/v1/admin/reviews')).status).toBe(401)
  })

  it('cannot be published or deleted without the key', async () => {
    expect((await call('/v1/reviews/1', 'PATCH', {}, '{"is_published":true}')).status).toBe(401)
    expect((await call('/v1/reviews/1', 'DELETE')).status).toBe(401)
  })

  it('asks the database for only the ones still waiting', async () => {
    await call('/v1/admin/reviews?published=false', 'GET', KEY)
    expect(asked[0]).toContain('is_published=eq.false')
  })

  it('returns both when no filter is given', async () => {
    await call('/v1/admin/reviews', 'GET', KEY)
    expect(asked[0]).not.toContain('is_published=eq')
  })

  it('orders by when it arrived', async () => {
    await call('/v1/admin/reviews', 'GET', KEY)
    expect(asked[0]).toContain('order=created_at.desc')
  })

  it('refuses a published filter that is not a boolean', async () => {
    expect((await call('/v1/admin/reviews?published=maybe', 'GET', KEY)).status).toBe(400)
    expect(asked).toHaveLength(0)
  })

  it('lets an editor change only whether it is published', async () => {
    // The words are what somebody wrote. An editor who could rewrite them
    // would be publishing their own opinion under a visitor's name.
    expect((await call('/v1/reviews/1', 'PATCH', KEY, '{"comment":"rewritten"}')).status).toBe(400)
    expect((await call('/v1/reviews/1', 'PATCH', KEY, '{"rating":1}')).status).toBe(400)
  })
})

describe('the star breakdown', () => {
  it('counts each star', () => {
    expect(ratingBreakdown([{ rating: 5 }, { rating: 5 }, { rating: 3 }])).toEqual([0, 0, 1, 0, 2])
  })

  it('is all zeroes for a place with no reviews', () => {
    expect(ratingBreakdown([])).toEqual([0, 0, 0, 0, 0])
  })

  it('ignores a rating outside the scale rather than growing the array', () => {
    expect(ratingBreakdown([{ rating: 0 }, { rating: 9 }, { rating: 4 }])).toEqual([0, 0, 0, 1, 0])
  })
})
