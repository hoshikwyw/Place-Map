import { describe, expect, it } from 'vitest'
import { toPlace } from '../src/lib/serialize'
import type { Env } from '../src/types'

/**
 * The serializer is where database columns become the shape every client
 * reads, so it is also where a hand-edited row has to stop being dangerous.
 */

const env = { IMAGEKIT_URL_ENDPOINT: 'https://img.test' } as Env

const row = (fields: Record<string, unknown> = {}) => ({
  id: 1,
  slug: 'cafe-central',
  name: { en: 'Cafe Central' },
  description: null,
  address: null,
  lat: null,
  lng: null,
  phone: null,
  website: null,
  links: [],
  opening_hours: null,
  rating: null,
  rating_count: 0,
  amenities: [],
  category: { id: 1, slug: 'cafes', name: { en: 'Cafes' }, icon: null },
  images: [],
  ...fields,
})

const place = (fields: Record<string, unknown> = {}) => toPlace(env, row(fields), 'en', 'en')

describe('price', () => {
  it('becomes one object from the three columns', () => {
    expect(place({ price_level: 2, price_min: 3000, price_max: 8000 }).price).toEqual({
      level: 2,
      min: 3000,
      max: 8000,
      currency: 'MMK',
    })
  })

  it('is null when the place says nothing about price', () => {
    expect(place().price).toBeNull()
    expect(place({ price_level: null, price_min: null, price_max: null }).price).toBeNull()
  })

  it('keeps a level with no range, and a range with no level', () => {
    expect(place({ price_level: 3 }).price).toEqual({
      level: 3,
      min: null,
      max: null,
      currency: 'MMK',
    })
    expect(place({ price_min: 3000 }).price).toEqual({
      level: null,
      min: 3000,
      max: null,
      currency: 'MMK',
    })
  })

  it('drops a level outside 1-3 instead of passing it on', () => {
    // A row edited by hand in the SQL editor can hold anything.
    for (const level of [0, 4, 99]) {
      expect(place({ price_level: level }).price).toBeNull()
    }
    // ...but a bad level must not discard a usable range.
    expect(place({ price_level: 9, price_min: 3000 }).price).toEqual({
      level: null,
      min: 3000,
      max: null,
      currency: 'MMK',
    })
  })

  it('reads Postgres numerics, which arrive as strings', () => {
    expect(place({ price_level: '2', price_min: '3000' }).price).toEqual({
      level: 2,
      min: 3000,
      max: null,
      currency: 'MMK',
    })
  })
})

describe('amenities', () => {
  it('passes the slugs through in the order they were chosen', () => {
    // The catalog decides how they are labelled and ordered on screen; the
    // place decides which ones it has.
    expect(place({ amenities: ['parking', 'wifi'] }).amenities).toEqual(['parking', 'wifi'])
  })

  it('keeps a slug whose amenity no longer exists', () => {
    // Nothing here can check the catalog - it is a separate read - and a place
    // must not fail to load because one of its amenities was deleted. The
    // client drops what it cannot resolve.
    expect(place({ amenities: ['wifi', 'retired_slug'] }).amenities).toEqual([
      'wifi',
      'retired_slug',
    ])
  })

  it('drops entries that are not usable slugs at all', () => {
    expect(place({ amenities: ['wifi', 42, null, ''] }).amenities).toEqual(['wifi'])
  })

  it('survives a column that is not an array at all', () => {
    expect(place({ amenities: null }).amenities).toEqual([])
    expect(place({ amenities: 'wifi' }).amenities).toEqual([])
  })
})
