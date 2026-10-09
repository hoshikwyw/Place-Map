import { describe, expect, it } from 'vitest'
import { PLACE_IDS_MAX, PlaceFiltersSchema, PlaceIdsSchema } from '@place-map/shared'
import { applyPlaceFilters, filterKey, hasPlaceFilters } from '../src/lib/filters'

/**
 * Narrowing a list of places. The parsing matters because these arrive from a
 * URL anyone can edit, and the cache key matters because getting it wrong
 * serves a narrowed list to someone who asked for the whole one.
 */

const parse = (query: Record<string, string>) => PlaceFiltersSchema.parse(query)

describe('reading filters off a URL', () => {
  it('reads what a row of ticked boxes submits', () => {
    expect(parse({ price: '1,2', amenities: 'wifi,parking' })).toEqual({
      price: [1, 2],
      amenities: ['wifi', 'parking'],
    })
  })

  it('tolerates the spacing and trailing commas people leave in a URL', () => {
    expect(parse({ price: '1, 3,', amenities: ' wifi , ' })).toEqual({
      price: [1, 3],
      amenities: ['wifi'],
    })
  })

  it('means "no filter" when absent or empty, not "match nothing"', () => {
    expect(parse({})).toEqual({})
    expect(parse({ price: '', amenities: '' })).toEqual({ price: [], amenities: [] })
    expect(hasPlaceFilters(parse({ price: '', amenities: '' }))).toBe(false)
    expect(hasPlaceFilters(parse({ price: '2' }))).toBe(true)
  })

  it('refuses a price level that is not on the scale', () => {
    for (const price of ['0', '4', '-1', 'cheap', '1,9']) {
      expect({ price, ok: PlaceFiltersSchema.safeParse({ price }).success }).toEqual({
        price,
        ok: false,
      })
    }
  })

  it('refuses an implausible pile of amenities', () => {
    const many = Array.from({ length: 21 }, (_, i) => `a${i}`).join(',')
    expect(PlaceFiltersSchema.safeParse({ amenities: many }).success).toBe(false)
  })
})

describe('applying them to a query', () => {
  /** Records what the real builder would have been asked to do. */
  function spy() {
    const calls: string[] = []
    const builder = {
      in(column: string, values: readonly (string | number)[]) {
        calls.push(`in:${column}=${values.join(',')}`)
        return builder
      },
      contains(column: string, value: string) {
        calls.push(`contains:${column}=${value}`)
        return builder
      },
    }
    return { builder, calls }
  }

  it('asks the database, not the page, so paging stays honest', () => {
    const { builder, calls } = spy()
    applyPlaceFilters(builder, parse({ price: '1,2', amenities: 'wifi,parking' }))

    expect(calls).toEqual(['in:price_level=1,2', 'contains:amenities=["wifi","parking"]'])
  })

  it('requires every ticked amenity, not any of them', () => {
    // "has wifi AND parking" is what a row of checkboxes means.
    const { builder, calls } = spy()
    applyPlaceFilters(builder, parse({ amenities: 'wifi,parking' }))

    expect(calls).toEqual(['contains:amenities=["wifi","parking"]'])
  })

  it('sends amenities as JSON, because the column is jsonb', () => {
    // An array here becomes Postgres's own array literal, cs.{wifi}, which
    // the database rejects as invalid JSON.
    const { builder, calls } = spy()
    applyPlaceFilters(builder, parse({ amenities: 'wifi' }))

    expect(calls[0]).toBe('contains:amenities=["wifi"]')
  })

  it('touches nothing when nothing was asked for', () => {
    const { builder, calls } = spy()
    applyPlaceFilters(builder, parse({}))

    expect(calls).toEqual([])
  })
})

describe('the cache key', () => {
  it('separates a filtered list from the unfiltered one', () => {
    expect(filterKey(parse({}))).not.toBe(filterKey(parse({ price: '1' })))
  })

  it('treats the same filters in a different order as the same list', () => {
    // Otherwise every ordering of the same boxes is cached again.
    expect(filterKey(parse({ price: '2,1', amenities: 'parking,wifi' }))).toBe(
      filterKey(parse({ price: '1,2', amenities: 'wifi,parking' })),
    )
  })

  it('keeps different filters apart', () => {
    expect(filterKey(parse({ amenities: 'wifi' }))).not.toBe(filterKey(parse({ amenities: 'parking' })))
    expect(filterKey(parse({ price: '1' }))).not.toBe(filterKey(parse({ price: '1,2' })))
  })
})

/**
 * Fetching a named set of places - what a saved list asks for. The ids come
 * from a URL, so they are checked before they reach a query.
 */
describe('asking for specific places', () => {
  const ids = (value: string) => PlaceIdsSchema.parse({ ids: value }).ids

  it('reads a list of ids', () => {
    expect(ids('12,7,3')).toEqual([12, 7, 3])
  })

  it('asks for a place once however many times it appears', () => {
    expect(ids('5,5,5')).toEqual([5])
  })

  it('treats an empty list as "nothing", not "everything"', () => {
    // A reader who saved nothing must not be handed the whole directory.
    expect(ids('')).toEqual([])
    expect(PlaceIdsSchema.parse({}).ids).toBeUndefined()
  })

  it('refuses anything that is not a real id', () => {
    for (const bad of ['abc', '-5', '0', '1.5', '1,abc']) {
      expect({ bad, ok: PlaceIdsSchema.safeParse({ ids: bad }).success }).toEqual({ bad, ok: false })
    }
  })

  it('caps the list, so one request cannot ask for the whole table', () => {
    const many = Array.from({ length: PLACE_IDS_MAX + 1 }, (_, i) => i + 1).join(',')
    expect(PlaceIdsSchema.safeParse({ ids: many }).success).toBe(false)

    const most = Array.from({ length: PLACE_IDS_MAX }, (_, i) => i + 1).join(',')
    expect(PlaceIdsSchema.safeParse({ ids: most }).success).toBe(true)
  })
})
