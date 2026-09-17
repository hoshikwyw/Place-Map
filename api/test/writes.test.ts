import { describe, expect, it } from 'vitest'
import { CreatePlaceSchema, SlugSchema, UpdatePlaceSchema } from '@place-map/shared'
import worker from '../src/index'
import type { Env } from '../src/types'

const env = {
  ADMIN_API_KEY: 'correct-horse-battery-staple',
  DEFAULT_LANG: 'en',
  SUPPORTED_LANGS: 'en,my',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'unused-in-these-tests',
  IMAGEKIT_URL_ENDPOINT: 'https://ik.example/x',
} as Env

const ctx = {
  waitUntil() {},
  passThroughOnException() {},
} as unknown as ExecutionContext

function post(path: string, headers: Record<string, string> = {}, body = '{}') {
  return worker.fetch(
    new Request(`https://api.test${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body,
    }),
    env,
    ctx,
  )
}

describe('write auth', () => {
  it('rejects a request with no key', async () => {
    const res = await post('/v1/places')
    expect(res.status).toBe(401)
  })

  it('rejects a wrong key', async () => {
    const res = await post('/v1/places', { 'X-API-Key': 'wrong' })
    expect(res.status).toBe(401)
  })

  it('rejects a key that is a prefix of the real one', async () => {
    const res = await post('/v1/places', { 'X-API-Key': 'correct-horse' })
    expect(res.status).toBe(401)
  })

  it('answers 401 with the standard error envelope, revealing nothing', async () => {
    const res = await post('/v1/places', { 'X-API-Key': 'wrong' })
    const body = (await res.json()) as { error: { code: string; message: string } }
    expect(body.error.code).toBe('not_found')
    expect(body.error.message).toBe('Not found')
  })

  it('refuses writes entirely when ADMIN_API_KEY is unset, rather than falling open', async () => {
    const res = await worker.fetch(
      new Request('https://api.test/v1/places', {
        method: 'POST',
        headers: { 'X-API-Key': 'anything' },
        body: '{}',
      }),
      { ...env, ADMIN_API_KEY: '' } as Env,
      ctx,
    )
    expect(res.status).toBe(500)
  })

  it('lets a correct key through to validation, not past it', async () => {
    // 400 here proves the guard passed and the body was rejected on its merits,
    // without any database call.
    const res = await post('/v1/places', { 'X-API-Key': env.ADMIN_API_KEY }, 'not json')
    expect(res.status).toBe(400)
  })

  it('leaves read endpoints public', async () => {
    const res = await worker.fetch(new Request('https://api.test/'), env, ctx)
    expect(res.status).toBe(200)
  })

  it('answers an unknown public path with 404, not a misleading 401', async () => {
    const res = await worker.fetch(new Request('https://api.test/v1/no-such-thing'), env, ctx)
    expect(res.status).toBe(404)
  })

  it('still demands the key for admin reads', async () => {
    const res = await worker.fetch(new Request('https://api.test/v1/admin/categories'), env, ctx)
    expect(res.status).toBe(401)
  })

  it('still demands the key for an unknown admin path', async () => {
    const res = await worker.fetch(new Request('https://api.test/v1/admin/no-such-thing'), env, ctx)
    expect(res.status).toBe(401)
  })

  it('still demands the key for every write method', async () => {
    for (const method of ['POST', 'PATCH', 'DELETE']) {
      const res = await worker.fetch(new Request('https://api.test/v1/places/1', { method }), env, ctx)
      expect(res.status, method).toBe(401)
    }
  })
})

describe('write schemas', () => {
  const valid = {
    category_id: 3,
    slug: 'cafe-central',
    name: { en: 'Cafe Central' },
  }

  it('accepts a minimal place and applies defaults', () => {
    const parsed = CreatePlaceSchema.parse(valid)
    expect(parsed.is_active).toBe(true)
    expect(parsed.sort_order).toBe(0)
  })

  it('rejects half a coordinate', () => {
    expect(CreatePlaceSchema.safeParse({ ...valid, lat: 41.3 }).success).toBe(false)
    expect(CreatePlaceSchema.safeParse({ ...valid, lng: 69.2 }).success).toBe(false)
    expect(CreatePlaceSchema.safeParse({ ...valid, lat: 41.3, lng: 69.2 }).success).toBe(true)
  })

  it('rejects an empty name object', () => {
    expect(CreatePlaceSchema.safeParse({ ...valid, name: {} }).success).toBe(false)
  })

  it('rejects an empty update rather than issuing a no-op write', () => {
    expect(UpdatePlaceSchema.safeParse({}).success).toBe(false)
  })

  it('allows a partial update', () => {
    expect(UpdatePlaceSchema.safeParse({ phone: '+959123456789' }).success).toBe(true)
  })

  it('enforces url-safe slugs', () => {
    for (const good of ['cafe', 'cafe-central', 'a1-b2']) {
      expect(SlugSchema.safeParse(good).success).toBe(true)
    }
    for (const bad of ['Cafe', 'cafe central', 'cafe--central', '-cafe', 'cafe-', 'кафе', '']) {
      expect(SlugSchema.safeParse(bad).success).toBe(false)
    }
  })

  it('rejects opening hours that close before they open', () => {
    const parsed = CreatePlaceSchema.safeParse({
      ...valid,
      opening_hours: { mon: [['18:00', '09:00']] },
    })
    expect(parsed.success).toBe(false)
  })

  it('accepts a split shift', () => {
    const parsed = CreatePlaceSchema.safeParse({
      ...valid,
      opening_hours: {
        sat: [
          ['10:00', '14:00'],
          ['16:00', '22:00'],
        ],
      },
    })
    expect(parsed.success).toBe(true)
  })
})
