import { describe, expect, it } from 'vitest'
import { purgeAmenities, purgeCategories, purgePlace } from '../src/lib/purge'
import type { Env } from '../src/types'

/**
 * Cache invalidation, which nothing else here covers and which fails silently
 * when it is wrong: the write succeeds, and a stale page is served for minutes.
 *
 * A fake KV records what was deleted. The keys below are the ones the API
 * actually writes - see cacheKey in lib/cache.ts.
 */

const KEYS = [
  'v1:categories:en',
  'v1:categories:my',
  'v1:categories:all-languages', // what the assistant parses category names from
  'v1:amenities:en',
  'v1:places:en:1:20',
  'v1:category:cafes:en:1:20',
  'v1:place:cafe-central:en',
  'v1:place:12:en',
  'v1:place:12:images',
]

function fakeCache(keys = KEYS) {
  const remaining = new Set(keys)
  const deleted: string[] = []

  const CACHE = {
    list: async ({ prefix }: { prefix: string }) => ({
      keys: [...remaining].filter((name) => name.startsWith(prefix)).map((name) => ({ name })),
      list_complete: true,
      cursor: undefined,
    }),
    delete: async (name: string) => {
      remaining.delete(name)
      deleted.push(name)
    },
  }

  return { env: { CACHE } as unknown as Env, deleted, remaining }
}

describe('purging after a write', () => {
  it('drops every place when a category changes, not just the lists', () => {
    // A place carries its category's name and icon, so renaming a category
    // makes every cached place wrong until this purge reaches it.
    return (async () => {
      const { env, deleted } = fakeCache()
      await purgeCategories(env)

      expect(deleted).toEqual(
        expect.arrayContaining([
          'v1:categories:en',
          'v1:categories:my',
          'v1:categories:all-languages',
          'v1:places:en:1:20',
          'v1:category:cafes:en:1:20',
          'v1:place:cafe-central:en',
          'v1:place:12:en',
        ]),
      )
    })()
  })

  it('leaves the amenity catalog alone when a category changes', async () => {
    const { env, remaining } = fakeCache()
    await purgeCategories(env)
    expect(remaining.has('v1:amenities:en')).toBe(true)
  })

  it('drops only the amenity catalog when an amenity changes', async () => {
    // Places store amenity slugs, not names, so no place payload goes stale.
    const { env, deleted, remaining } = fakeCache()
    await purgeAmenities(env)

    expect(deleted).toEqual(['v1:amenities:en'])
    expect(remaining.has('v1:place:cafe-central:en')).toBe(true)
    expect(remaining.has('v1:places:en:1:20')).toBe(true)
  })

  it('drops a place under both the id and the slug it is addressed by', async () => {
    const { env, deleted } = fakeCache()
    await purgePlace(env, 12, 'cafe-central')

    expect(deleted).toEqual(
      expect.arrayContaining([
        'v1:place:12:en',
        'v1:place:12:images',
        'v1:place:cafe-central:en',
        'v1:category:cafes:en:1:20',
        'v1:places:en:1:20',
      ]),
    )
  })

  it('does nothing, and does not throw, when KV is not configured', async () => {
    // The binding is optional: the API works without it, just talking to
    // Postgres more.
    await expect(purgeCategories({} as Env)).resolves.toBeUndefined()
    await expect(purgePlace({} as Env, 1, 'x')).resolves.toBeUndefined()
  })

  it('swallows a KV failure rather than failing the write', async () => {
    // The entry expires on its own within minutes; losing the edit would be
    // the worse outcome.
    const env = {
      CACHE: {
        list: async () => {
          throw new Error('KV is having a day')
        },
        delete: async () => {},
      },
    } as unknown as Env

    await expect(purgeCategories(env)).resolves.toBeUndefined()
  })
})
