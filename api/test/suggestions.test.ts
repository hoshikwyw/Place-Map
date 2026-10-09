import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SUGGESTION_NOTE_MAX } from '@place-map/shared'
import worker from '../src/index'
import type { Env } from '../src/types'

/**
 * The public write.
 *
 * Everything here is about what happens before the database: this is the one
 * endpoint a stranger can post to, so the interesting behaviour is what it
 * refuses, what it quietly swallows, and what it declines to tell anybody.
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

/** Rows the endpoint tried to insert, in order. */
let inserted: Record<string, unknown>[] = []

/** Every URL the Worker asked PostgREST for, so a filter can be checked. */
let asked: string[] = []

beforeEach(() => {
  inserted = []
  asked = []
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input))
    if (url.pathname === '/rest/v1/suggestions') {
      asked.push(url.search)
      if ((init?.method ?? 'GET') !== 'GET') {
        inserted.push(JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>)
      }
      return new Response('[]', { status: 201, headers: { 'Content-Type': 'application/json' } })
    }
    throw new Error(`unexpected request to ${url.pathname}`)
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/** A KV namespace that only remembers things, which is all the counter needs. */
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
  } as unknown as KVNamespace
}

function suggest(body: unknown, headers: Record<string, string> = {}, override: Partial<Env> = {}) {
  return worker.fetch(
    new Request('https://api.test/v1/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
    { ...env, ...override } as Env,
    ctx,
  )
}

const NEW_PLACE = { kind: 'new_place', name: 'Shwe Cafe', note: 'Corner of 35th and Merchant.' }

async function errorOf(res: Response) {
  const body = (await res.json()) as { error: { code: string; message: string } }
  return body.error
}

describe('POST /v1/suggestions', () => {
  it('accepts a suggestion with no API key at all', async () => {
    const res = await suggest(NEW_PLACE)
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ data: { received: true } })
  })

  it('stores what was sent, with the language it was written in', async () => {
    await suggest({ ...NEW_PLACE, contact: 'me@example.com', lang: 'my' })
    expect(inserted).toHaveLength(1)
    expect(inserted[0]).toMatchObject({
      kind: 'new_place',
      name: 'Shwe Cafe',
      note: 'Corner of 35th and Merchant.',
      contact: 'me@example.com',
      lang: 'my',
    })
  })

  it('tells the sender nothing about the row it stored', async () => {
    const res = await suggest(NEW_PLACE)
    const body = (await res.json()) as { data: Record<string, unknown> }
    // No id, no created_at, no status: an endpoint that echoes what it stored
    // is an endpoint that can be probed.
    expect(Object.keys(body.data)).toEqual(['received'])
  })

  it('is never cached, so a second suggestion is not answered by the first', async () => {
    const res = await suggest(NEW_PLACE)
    expect(res.headers.get('Cache-Control')).toContain('no-store')
  })

  it('keeps the place a correction is about', async () => {
    await suggest({ kind: 'correction', place_id: 42, note: 'The phone number is wrong.' })
    expect(inserted[0]).toMatchObject({ kind: 'correction', place_id: 42 })
  })

  it('drops a place_id sent with a new place, which cannot be about one', async () => {
    await suggest({ ...NEW_PLACE, place_id: 42 })
    expect(inserted[0]).toMatchObject({ kind: 'new_place', place_id: null })
  })

  it('needs a name for a new place, and says which field', async () => {
    const res = await suggest({ kind: 'new_place', note: 'There is a place here.' })
    expect(res.status).toBe(400)
    expect((await errorOf(res)).message).toContain('name')
    expect(inserted).toHaveLength(0)
  })

  it('needs no name for a correction, where the note carries everything', async () => {
    const res = await suggest({ kind: 'correction', place_id: 7, note: 'Closed down last month.' })
    expect(res.status).toBe(201)
  })

  it('refuses a note too short to act on', async () => {
    const res = await suggest({ ...NEW_PLACE, note: 'bad' })
    expect(res.status).toBe(400)
    expect(inserted).toHaveLength(0)
  })

  it('refuses a note longer than anybody will read', async () => {
    const res = await suggest({ ...NEW_PLACE, note: 'x'.repeat(SUGGESTION_NOTE_MAX + 1) })
    expect(res.status).toBe(400)
    expect(inserted).toHaveLength(0)
  })

  it('refuses a kind it does not know', async () => {
    const res = await suggest({ kind: 'complaint', note: 'Everything is wrong.' })
    expect(res.status).toBe(400)
    expect(inserted).toHaveLength(0)
  })

  it('refuses a body that is not JSON', async () => {
    const res = await suggest('not json')
    expect(res.status).toBe(400)
    expect(inserted).toHaveLength(0)
  })

  it('answers a filled honeypot as if it worked, and stores nothing', async () => {
    const res = await suggest({ ...NEW_PLACE, website: 'http://spam.example' })
    // 201, because telling a script it was spotted only teaches it to try again.
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ data: { received: true } })
    expect(inserted).toHaveLength(0)
  })

  it('reports an insert failure as a server error, without the database detail', async () => {
    vi.stubGlobal(
      'fetch',
      async () =>
        new Response(JSON.stringify({ message: 'relation "suggestions" does not exist' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }),
    )
    const res = await suggest(NEW_PLACE)
    expect(res.status).toBe(500)
    expect((await errorOf(res)).message).not.toContain('relation')
  })
})

describe('the rate limit', () => {
  const from = (address: string) => ({ 'CF-Connecting-IP': address })

  it('lets a person send several, then asks them to wait', async () => {
    const CACHE = memoryCache()

    for (let i = 0; i < 5; i += 1) {
      const res = await suggest(NEW_PLACE, from('203.0.113.7'), { CACHE })
      expect(res.status, `suggestion ${i + 1}`).toBe(201)
    }

    const sixth = await suggest(NEW_PLACE, from('203.0.113.7'), { CACHE })
    expect(sixth.status).toBe(429)
    expect(inserted).toHaveLength(5)
  })

  it('counts each address on its own, so one sender cannot silence a street', async () => {
    const CACHE = memoryCache()
    for (let i = 0; i < 5; i += 1) await suggest(NEW_PLACE, from('203.0.113.7'), { CACHE })

    const other = await suggest(NEW_PLACE, from('198.51.100.4'), { CACHE })
    expect(other.status).toBe(201)
  })

  it('accepts suggestions when no cache is configured, rather than refusing them', async () => {
    // KV is optional on the free plan. Without it the honeypot and the length
    // limits carry the weight; a missing cache must not close the door.
    for (let i = 0; i < 8; i += 1) {
      const res = await suggest(NEW_PLACE, from('203.0.113.7'))
      expect(res.status).toBe(201)
    }
  })

  it('does not spend the allowance on a request that was never stored', async () => {
    const CACHE = memoryCache()
    for (let i = 0; i < 6; i += 1) await suggest({ ...NEW_PLACE, note: 'no' }, from('203.0.113.7'), { CACHE })

    const good = await suggest(NEW_PLACE, from('203.0.113.7'), { CACHE })
    expect(good.status).toBe(201)
  })

  it('keeps working when the cache itself fails', async () => {
    const broken = {
      async get() {
        throw new Error('KV unavailable')
      },
      async put() {},
    } as unknown as KVNamespace

    const res = await suggest(NEW_PLACE, from('203.0.113.7'), { CACHE: broken })
    expect(res.status).toBe(201)
  })
})

describe('the moderation queue', () => {
  const KEY = { 'X-API-Key': env.ADMIN_API_KEY }

  function call(path: string, method = 'GET', headers: Record<string, string> = {}, body?: string) {
    return worker.fetch(
      new Request(`https://api.test${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body,
      }),
      env,
      ctx,
    )
  }

  it('is not readable without the key', async () => {
    expect((await call('/v1/admin/suggestions')).status).toBe(401)
  })

  it('cannot be edited or deleted without the key', async () => {
    expect((await call('/v1/suggestions/1', 'PATCH', {}, '{"status":"done"}')).status).toBe(401)
    expect((await call('/v1/suggestions/1', 'DELETE')).status).toBe(401)
  })

  it('asks the database for only the status requested', async () => {
    const res = await call('/v1/admin/suggestions?status=new', 'GET', KEY)
    expect(res.status).toBe(200)
    expect(asked[0]).toContain('status=eq.new')
  })

  it('returns every suggestion when no status is named', async () => {
    const res = await call('/v1/admin/suggestions', 'GET', KEY)
    expect(res.status).toBe(200)
    expect(asked[0]).not.toContain('status=eq')
  })

  it('orders by when it arrived, never by the status column', async () => {
    // Ascending by status would read 'done', 'ignored', 'new' - alphabetical,
    // which buries the unread ones under everything already dealt with.
    await call('/v1/admin/suggestions?status=new', 'GET', KEY)
    expect(asked[0]).toContain('order=created_at.desc')
    expect(asked[0]).not.toContain('order=status')
  })

  it('refuses a status that is not one of the three', async () => {
    const res = await call('/v1/admin/suggestions?status=pending', 'GET', KEY)
    expect(res.status).toBe(400)
    expect(asked).toHaveLength(0)
  })

  it('accepts only a status when marking one, and nothing else', async () => {
    const res = await call('/v1/suggestions/1', 'PATCH', KEY, '{"note":"rewritten by an editor"}')
    // The message is what somebody sent; an editor who could edit it would be
    // editing the evidence.
    expect(res.status).toBe(400)
  })

  it('refuses a status it does not know when marking one', async () => {
    const res = await call('/v1/suggestions/1', 'PATCH', KEY, '{"status":"maybe"}')
    expect(res.status).toBe(400)
  })
})

describe('what a browser is allowed to send', () => {
  function preflight(path: string, method: string) {
    return worker.fetch(
      new Request(`https://api.test${path}`, {
        method: 'OPTIONS',
        headers: { Origin: 'https://place-map.example', 'Access-Control-Request-Method': method },
      }),
      env,
      ctx,
    )
  }

  it('lets a page on another origin post a suggestion', async () => {
    const res = await preflight('/v1/suggestions', 'POST')
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST')
  })

  it('still refuses every other write from a browser', async () => {
    // The form has to be sendable from the site; nothing else does. A key that
    // leaked would still be unspendable from a page.
    for (const path of ['/v1/places', '/v1/categories', '/v1/amenities']) {
      const methods = (await preflight(path, 'POST')).headers.get('Access-Control-Allow-Methods')
      expect(methods, path).not.toContain('POST')
    }
  })

  it('does not extend the exception to marking a suggestion read', async () => {
    const methods = (await preflight('/v1/suggestions/1', 'PATCH')).headers.get(
      'Access-Control-Allow-Methods',
    )
    expect(methods).not.toContain('PATCH')
    expect(methods).not.toContain('POST')
  })

  it('still lets a browser read the places', async () => {
    const methods = (await preflight('/v1/places', 'GET')).headers.get('Access-Control-Allow-Methods')
    expect(methods).toContain('GET')
  })
})
