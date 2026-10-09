import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, listAllPlaces, listCategories, listSuggestions, updateCategory } from '@/lib/api'

/**
 * The dashboard's only route to data.
 *
 * Two things are worth pinning here. The API key must be attached to every
 * request and must never be the thing a test has to remember - it is what makes
 * these calls privileged. And `listAllPlaces` walks pages in a loop whose
 * bound is the only thing between a wrong `total` and a hung page.
 */

interface Call {
  url: string
  method: string
  headers: Record<string, string>
  cache: RequestCache | undefined
}

let calls: Call[] = []
let answer: (call: Call) => { status?: number; body?: unknown } = () => ({})

beforeEach(() => {
  calls = []
  answer = () => ({ body: { data: [] } })

  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const call: Call = {
      url: String(input),
      method: init?.method ?? 'GET',
      headers: Object.fromEntries(
        Object.entries((init?.headers ?? {}) as Record<string, string>).map(([k, v]) => [
          k.toLowerCase(),
          v,
        ]),
      ),
      cache: init?.cache,
    }
    calls.push(call)

    const { status = 200, body = { data: [] } } = answer(call)
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  })
})

afterEach(() => vi.unstubAllGlobals())

const page = (count: number, total: number) => ({
  data: Array.from({ length: count }, (_, i) => ({ id: i + 1, slug: `p${i}` })),
  meta: { page: 1, limit: 100, total },
})

describe('every request', () => {
  it('carries the admin API key', async () => {
    await listCategories()
    expect(calls[0]?.headers['x-api-key']).toBe('test-api-key')
  })

  it('goes to the configured API', async () => {
    await listCategories()
    expect(calls[0]?.url).toBe('https://api.test/v1/admin/categories')
  })

  it('never serves a cached copy', async () => {
    // An editor who just saved must see what is stored, not what was stored
    // before the save that brought them back to this page.
    await listCategories()
    expect(calls[0]?.cache).toBe('no-store')
  })

  it('reads admin routes, not the public ones', async () => {
    // The public routes hide inactive rows and flatten names to one language;
    // an editor needs both.
    await listCategories()
    await listSuggestions('new')
    expect(calls.map((call) => new URL(call.url).pathname)).toEqual([
      '/v1/admin/categories',
      '/v1/admin/suggestions',
    ])
  })

  it('sends a status filter when one is asked for', async () => {
    await listSuggestions('done')
    expect(calls[0]?.url).toContain('status=done')
  })

  it('sends no filter when none is asked for', async () => {
    await listSuggestions()
    expect(calls[0]?.url).not.toContain('status=')
  })
})

describe('when the API says no', () => {
  it('raises the message the API gave, which is written to be read', async () => {
    answer = () => ({ status: 400, body: { error: { message: 'slug: already taken' } } })
    await expect(updateCategory(1, {})).rejects.toThrow('slug: already taken')
  })

  it('carries the status, so a caller can tell 404 from 500', async () => {
    answer = () => ({ status: 404, body: { error: { message: 'No such category' } } })
    await expect(updateCategory(1, {})).rejects.toMatchObject({ status: 404 })
  })

  it('falls back to the status when there is no message', async () => {
    answer = () => ({ status: 500, body: {} })
    await expect(updateCategory(1, {})).rejects.toThrow(/500/)
  })

  it('raises an ApiError, not a bare Error', async () => {
    answer = () => ({ status: 401, body: {} })
    await expect(updateCategory(1, {})).rejects.toBeInstanceOf(ApiError)
  })
})

describe('when the API cannot be reached at all', () => {
  it('says where it tried and what to do', async () => {
    // Undici reports this as a bare "fetch failed", which names neither.
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('fetch failed')
    })

    await expect(listCategories()).rejects.toThrow(/Cannot reach the API at https:\/\/api\.test/)
    await expect(listCategories()).rejects.toThrow(/pnpm dev/)
  })

  it('keeps the original failure as the cause', async () => {
    const original = new TypeError('fetch failed')
    vi.stubGlobal('fetch', async () => {
      throw original
    })

    await expect(listCategories()).rejects.toMatchObject({ cause: original })
  })
})

describe('reading every place', () => {
  it('stops after one page when that is all there is', async () => {
    answer = () => ({ body: page(40, 40) })
    expect(await listAllPlaces()).toHaveLength(40)
    expect(calls).toHaveLength(1)
  })

  it('walks pages until it has them all', async () => {
    // The admin list endpoint caps a page at 100. A count built from the first
    // page understates, and the amenity delete warning rests on that count.
    answer = (call) => ({ body: new URL(call.url).searchParams.get('page') === '1' ? page(100, 150) : page(50, 150) })
    expect(await listAllPlaces()).toHaveLength(150)
    expect(calls).toHaveLength(2)
  })

  it('asks for the biggest page the endpoint allows', async () => {
    answer = () => ({ body: page(10, 10) })
    await listAllPlaces()
    expect(new URL(calls[0]!.url).searchParams.get('limit')).toBe('100')
  })

  it('stops on a short page even when the total disagrees', async () => {
    // A wrong total must not turn into an endless loop on a page load.
    answer = () => ({ body: page(10, 99_999) })
    expect(await listAllPlaces()).toHaveLength(10)
    expect(calls).toHaveLength(1)
  })

  it('gives up after twenty pages rather than spinning forever', async () => {
    // Every page full, and a total that never arrives.
    answer = () => ({ body: page(100, Number.MAX_SAFE_INTEGER) })
    expect(await listAllPlaces()).toHaveLength(2000)
    expect(calls).toHaveLength(20)
  })

  it('handles there being no places at all', async () => {
    answer = () => ({ body: page(0, 0) })
    expect(await listAllPlaces()).toEqual([])
  })
})
