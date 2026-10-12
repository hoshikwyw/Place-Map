import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Opening a shortened map link on the server.
 *
 * This is the one place in the dashboard that fetches a URL somebody typed, so
 * most of what follows is about where it will and will not go. An allowlist
 * that checks only the first URL is no allowlist at all: a short link exists
 * to redirect, and the redirect is attacker-chosen.
 */

const jar = new Map<string, string>()

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
}))

class Redirected extends Error {
  constructor(readonly to: string) {
    super(`redirect to ${to}`)
  }
}

vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Redirected(to)
  },
}))

const { resolveMapLink } = await import('@/actions/map-link')
const { startSession } = await import('@/lib/auth')

/** Each entry is one hop: a Location header, or a final body. */
let hops: Record<string, { location?: string; body?: string; url?: string }> = {}
let asked: string[] = []

beforeEach(async () => {
  jar.clear()
  hops = {}
  asked = []
  await startSession()

  vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
    const url = String(input)
    asked.push(url)
    const hop = hops[url]
    if (!hop) return new Response('not found', { status: 404 })
    if (hop.location) {
      return new Response('', { status: 302, headers: { location: hop.location } })
    }
    const response = new Response(hop.body ?? '', { status: 200 })
    Object.defineProperty(response, 'url', { value: hop.url ?? url })
    return response
  })
})

afterEach(() => vi.unstubAllGlobals())

const SHORT = 'https://maps.app.goo.gl/AbCdEfGh'
const YANGON = { lat: 16.7751, lng: 96.1605 }

describe('the session', () => {
  it('is required, because an action is its own endpoint', async () => {
    jar.clear()
    await expect(resolveMapLink(SHORT)).rejects.toBeInstanceOf(Redirected)
  })

  it('is checked before anything is fetched', async () => {
    jar.clear()
    await resolveMapLink(SHORT).catch(() => {})
    expect(asked).toHaveLength(0)
  })
})

describe('a link it can already read', () => {
  it('is answered without any request at all', async () => {
    const result = await resolveMapLink('https://www.google.com/maps/@16.7751,96.1605,17z')
    expect(result.coordinates).toEqual(YANGON)
    expect(asked).toHaveLength(0)
  })

  it('works for a bare pair of numbers', async () => {
    expect((await resolveMapLink('16.7751, 96.1605')).coordinates).toEqual(YANGON)
    expect(asked).toHaveLength(0)
  })
})

describe('a shortened link', () => {
  it('is followed, and the coordinates read from where it lands', async () => {
    hops[SHORT] = {
      location:
        'https://www.google.com/maps/place/Cafe/@16.7800,96.1700,17z/data=!4m6!3m5!8m2!3d16.7751!4d96.1605',
    }
    expect((await resolveMapLink(SHORT)).coordinates).toEqual(YANGON)
  })

  it('is followed through more than one hop', async () => {
    hops[SHORT] = { location: 'https://goo.gl/maps/Second' }
    hops['https://goo.gl/maps/Second'] = {
      location: 'https://www.google.com/maps/@16.7751,96.1605,17z',
    }
    expect((await resolveMapLink(SHORT)).coordinates).toEqual(YANGON)
  })

  it('reads coordinates out of the page when the final URL has none', async () => {
    hops[SHORT] = { location: 'https://www.google.com/maps/place/Cafe' }
    hops['https://www.google.com/maps/place/Cafe'] = {
      body: '<html>…"!3d16.7751!4d96.1605"…</html>',
    }
    expect((await resolveMapLink(SHORT)).coordinates).toEqual(YANGON)
  })

  it('gives up politely when the page has no coordinates either', async () => {
    hops[SHORT] = { location: 'https://www.google.com/maps/place/Cafe' }
    hops['https://www.google.com/maps/place/Cafe'] = { body: '<html>nothing useful</html>' }
    const result = await resolveMapLink(SHORT)
    expect(result.coordinates).toBeUndefined()
    expect(result.error).toMatch(/no coordinates/i)
  })
})

describe('where it will not go', () => {
  it('refuses a host that is not a map', async () => {
    const result = await resolveMapLink('https://example.com/looks-like-a-map')
    expect(result.error).toMatch(/does not look like a map link/i)
    expect(asked).toHaveLength(0)
  })

  it('refuses to be pointed at this network', async () => {
    for (const url of [
      'http://localhost:8787/v1/health',
      'http://127.0.0.1/',
      'http://169.254.169.254/latest/meta-data/',
      'https://192.168.0.1/admin',
    ]) {
      const result = await resolveMapLink(url)
      expect(result.error, url).toBeTruthy()
    }
    expect(asked).toHaveLength(0)
  })

  it('refuses a redirect that leaves the map hosts', async () => {
    // The attack this guards: the first URL is allowed, and the redirect is
    // chosen by whoever made the link.
    hops[SHORT] = { location: 'http://169.254.169.254/latest/meta-data/' }
    const result = await resolveMapLink(SHORT)
    expect(result.error).toMatch(/redirects somewhere unexpected/i)
    expect(asked).toEqual([SHORT])
  })

  it('refuses a redirect to a lookalike host', async () => {
    hops[SHORT] = { location: 'https://maps.app.goo.gl.evil.test/x' }
    expect((await resolveMapLink(SHORT)).error).toMatch(/unexpected/i)
  })

  it('stops after a handful of hops rather than looping', async () => {
    hops[SHORT] = { location: 'https://goo.gl/a' }
    hops['https://goo.gl/a'] = { location: 'https://goo.gl/b' }
    hops['https://goo.gl/b'] = { location: 'https://goo.gl/c' }
    hops['https://goo.gl/c'] = { location: 'https://goo.gl/d' }
    hops['https://goo.gl/d'] = { location: 'https://goo.gl/e' }
    hops['https://goo.gl/e'] = { location: 'https://goo.gl/f' }

    const result = await resolveMapLink(SHORT)
    expect(result.error).toMatch(/too many times/i)
    expect(asked.length).toBeLessThanOrEqual(5)
  })
})

describe('when things go wrong', () => {
  it('says so when the link cannot be opened', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('fetch failed')
    })
    expect((await resolveMapLink(SHORT)).error).toMatch(/could not open/i)
  })

  it('says so when nothing was pasted', async () => {
    expect((await resolveMapLink('   ')).error).toMatch(/paste a link/i)
  })
})
