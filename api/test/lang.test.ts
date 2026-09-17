import { describe, expect, it } from 'vitest'
import { Hono } from 'hono'
import { langMiddleware, pickText } from '../src/lib/lang'
import type { AppBindings, Env } from '../src/types'

const env = {
  DEFAULT_LANG: 'en',
  SUPPORTED_LANGS: 'en,my',
} as Env

/** Mounts the middleware alone and reports which language it settled on. */
function app() {
  const a = new Hono<AppBindings>()
  a.use('*', langMiddleware)
  a.get('/', (c) => c.json({ lang: c.get('lang') }))
  return a
}

async function langFor(path: string, headers: Record<string, string> = {}) {
  const res = await app().request(path, { headers }, env)
  return { res, body: (await res.json()) as { lang: string } }
}

describe('language resolution', () => {
  it('falls back to DEFAULT_LANG when nothing is asked for', async () => {
    const { body } = await langFor('/')
    expect(body.lang).toBe('en')
  })

  it('honours ?lang= for a supported language', async () => {
    const { body } = await langFor('/?lang=my')
    expect(body.lang).toBe('my')
  })

  it('ignores an unsupported ?lang= rather than 400ing', async () => {
    const { body } = await langFor('/?lang=fr')
    expect(body.lang).toBe('en')
  })

  it('reads Accept-Language, respecting q-values and region subtags', async () => {
    const { body } = await langFor('/', { 'Accept-Language': 'fr;q=0.9,my-MM;q=0.8,en;q=0.2' })
    expect(body.lang).toBe('my')
  })

  it('lets ?lang= win over Accept-Language', async () => {
    const { body } = await langFor('/?lang=en', { 'Accept-Language': 'my' })
    expect(body.lang).toBe('en')
  })

  it('sets Vary so a shared cache cannot cross-serve languages', async () => {
    const { res } = await langFor('/?lang=my')
    expect(res.headers.get('Vary')).toContain('Accept-Language')
    expect(res.headers.get('Content-Language')).toBe('my')
  })
})

describe('pickText', () => {
  const value = { en: 'Cafe Central', my: 'ကဖေး စင်ထရယ်' }

  it('picks the requested locale', () => {
    expect(pickText(value, 'my', 'en')).toBe('ကဖေး စင်ထရယ်')
  })

  it('falls back to the default locale when the requested one is missing', () => {
    expect(pickText({ en: 'Only English' }, 'my', 'en')).toBe('Only English')
  })

  it('falls back to any locale rather than rendering an empty card', () => {
    expect(pickText({ ru: 'Only Russian' }, 'my', 'en')).toBe('Only Russian')
  })

  it('treats a blank string as missing', () => {
    expect(pickText({ my: '   ', en: 'Cafe' }, 'my', 'en')).toBe('Cafe')
  })

  it('returns null for null, which is a legal description', () => {
    expect(pickText(null, 'en', 'en')).toBeNull()
  })

  it('tolerates a plain string, in case a column is ever de-jsonb-ed', () => {
    expect(pickText('Plain', 'my', 'en')).toBe('Plain')
  })
})
