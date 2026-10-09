import { describe, expect, it } from 'vitest'
import type { Amenity, Place } from '@place-map/shared'
import {
  CAPTION_LIMIT,
  MESSAGE_LIMIT,
  formatAmenities,
  formatPlace,
  formatPrice,
} from '../src/bot/format'

/**
 * What the bot says about one place.
 *
 * A Telegram caption holds 1024 characters for everything - name, price,
 * description, address, a week of opening hours and a row of amenities - so
 * most of this is about what survives when they do not all fit.
 */

const CATALOG: Amenity[] = [
  { id: 1, slug: 'wifi', name: 'Wi-Fi', icon: '📶', icon_image: null },
  { id: 2, slug: 'outdoor_seating', name: 'Outdoor seating', icon: '🌤', icon_image: null },
  { id: 3, slug: 'parking', name: 'Parking', icon: null, icon_image: null },
]

const place = (over: Partial<Place> = {}): Place =>
  ({
    id: 1,
    slug: 'cafe-central',
    category: { id: 1, slug: 'cafes', name: 'Cafes', icon: '☕', icon_image: null },
    name: 'Cafe Central',
    description: null,
    address: null,
    location: null,
    phone: null,
    website: null,
    opening_hours: null,
    images: [],
    links: [],
    rating: null,
    rating_count: 0,
    price: null,
    amenities: [],
    ...over,
  }) as Place

const price = (over: Partial<NonNullable<Place['price']>> = {}) => ({
  level: null,
  min: null,
  max: null,
  currency: 'MMK' as const,
  ...over,
})

describe('the price line', () => {
  it('reads as a level and a range', () => {
    expect(formatPrice(place({ price: price({ level: 2, min: 3000, max: 8000 }) }), 'en')).toBe(
      '💵 Moderate · 3,000–8,000 Ks per person',
    )
  })

  it('attaches "per person" to the amounts, never to the level alone', () => {
    // "Moderate per person" is not something anybody says.
    expect(formatPrice(place({ price: price({ level: 2 }) }), 'en')).toBe('💵 Moderate')
  })

  it('says the same thing in Myanmar', () => {
    expect(formatPrice(place({ price: price({ level: 1, min: 1000 }) }), 'my')).toBe(
      '💵 သက်သာ · 1,000 ကျပ် မှ စ၍ တစ်ဦးလျှင်',
    )
  })

  it('shows nothing for a place with no price', () => {
    expect(formatPrice(place(), 'en')).toBeNull()
    expect(formatPrice(place({ price: price() }), 'en')).toBeNull()
  })
})

describe('the amenity row', () => {
  it('turns slugs into words, with their icons', () => {
    const text = formatAmenities(place({ amenities: ['wifi', 'outdoor_seating'] }), CATALOG, 'en')
    expect(text).toContain('📶 Wi-Fi')
    expect(text).toContain('🌤 Outdoor seating')
  })

  it('shows an amenity with no icon as just its name', () => {
    expect(formatAmenities(place({ amenities: ['parking'] }), CATALOG, 'en')).toContain('Parking')
  })

  it('reads in catalog order, not the order the place stored them', () => {
    const text = formatAmenities(place({ amenities: ['parking', 'wifi'] }), CATALOG, 'en')
    expect(text?.indexOf('Wi-Fi')).toBeLessThan(text?.indexOf('Parking') ?? 0)
  })

  it('drops a slug the catalog does not know, rather than printing it raw', () => {
    const text = formatAmenities(place({ amenities: ['wifi', 'retired_slug'] }), CATALOG, 'en')
    expect(text).toContain('Wi-Fi')
    expect(text).not.toContain('retired_slug')
  })

  it('shows nothing when every slug is unknown', () => {
    expect(formatAmenities(place({ amenities: ['gone'] }), CATALOG, 'en')).toBeNull()
  })

  it('shows nothing without a catalog, rather than a heading over nothing', () => {
    expect(formatAmenities(place({ amenities: ['wifi'] }), [], 'en')).toBeNull()
  })

  it('survives a place from before the amenities column existed', () => {
    expect(formatAmenities(place({ amenities: undefined as never }), CATALOG, 'en')).toBeNull()
  })

  it('escapes a name that contains markup', () => {
    const hostile: Amenity[] = [
      { id: 9, slug: 'x', name: '<b>bold</b>', icon: null, icon_image: null },
    ]
    expect(formatAmenities(place({ amenities: ['x'] }), hostile, 'en')).toContain('&lt;b&gt;')
  })
})

describe('the place screen', () => {
  const full = place({
    description: 'Small specialty coffee bar with outdoor seating.',
    address: '12 Pansodan St, Yangon',
    phone: '+959123456789',
    price: price({ level: 2, min: 3000, max: 8000 }),
    amenities: ['wifi', 'outdoor_seating', 'parking'],
    opening_hours: {
      mon: [['09:00', '18:00']],
      tue: [['09:00', '18:00']],
      wed: [['09:00', '18:00']],
      thu: [['09:00', '18:00']],
      fri: [['09:00', '18:00']],
      sat: [['10:00', '14:00']],
      sun: [],
    },
  })

  it('carries the price and the amenities', () => {
    const text = formatPlace(full, 'en', CAPTION_LIMIT, CATALOG)
    expect(text).toContain('Moderate')
    expect(text).toContain('Wi-Fi')
  })

  it('puts the price under the category, before the description', () => {
    const text = formatPlace(full, 'en', CAPTION_LIMIT, CATALOG)
    expect(text.indexOf('Cafes')).toBeLessThan(text.indexOf('Moderate'))
    expect(text.indexOf('Moderate')).toBeLessThan(text.indexOf('Small specialty'))
  })

  it('puts the amenities last, after the hours', () => {
    const text = formatPlace(full, 'en', CAPTION_LIMIT, CATALOG)
    expect(text.indexOf('Hours')).toBeLessThan(text.indexOf('Wi-Fi'))
  })

  it('renders a place with no catalog at all, losing only the amenities', () => {
    const text = formatPlace(full, 'en', CAPTION_LIMIT, [])
    expect(text).toContain('12 Pansodan St')
    expect(text).toContain('09:00-18:00')
    expect(text).toContain('Moderate')
    expect(text).not.toContain('Wi-Fi')
  })
})

describe('when it does not all fit', () => {
  const long = (chars: number) => 'x'.repeat(chars)

  const huge = place({
    description: long(900),
    address: '12 Pansodan Street, Kyauktada Township, Yangon',
    phone: '+959123456789',
    price: price({ level: 3, min: 12000, max: 40000 }),
    amenities: ['wifi', 'outdoor_seating', 'parking'],
    opening_hours: {
      mon: [['09:00', '18:00']],
      tue: [['10:00', '19:00']],
      wed: [['09:00', '18:00']],
      thu: [['11:00', '20:00']],
      fri: [['09:00', '18:00']],
      sat: [['10:00', '14:00'], ['16:00', '22:00']],
      sun: [['12:00', '16:00']],
    },
  })

  it('stays inside Telegram’s caption limit', () => {
    expect(formatPlace(huge, 'en', CAPTION_LIMIT, CATALOG).length).toBeLessThanOrEqual(CAPTION_LIMIT)
  })

  it('keeps the hours and the amenities, and shortens the description instead', () => {
    // The two things somebody opened the screen for. Cutting the end off - the
    // old behaviour - lost both.
    const text = formatPlace(huge, 'en', CAPTION_LIMIT, CATALOG)
    expect(text).toContain('Hours')
    expect(text).toContain('Sun 12:00-16:00')
    expect(text).toContain('Wi-Fi')
    expect(text).toContain('Parking')
  })

  it('keeps the price, which is one short line', () => {
    expect(formatPlace(huge, 'en', CAPTION_LIMIT, CATALOG)).toContain('Expensive')
  })

  it('did have to shorten the description to manage it', () => {
    const text = formatPlace(huge, 'en', CAPTION_LIMIT, CATALOG)
    expect(text).not.toContain(long(900))
    expect(text).toContain(long(120))
  })

  it('gives up as little of the description as it must', () => {
    // A place that only just overflows should lose a little, not everything.
    // Not an exact length: truncate() spends a character on the ellipsis, and
    // pinning the step would make this a test of the ladder's constants.
    const text = formatPlace(huge, 'en', CAPTION_LIMIT, CATALOG)
    expect(text).toContain(long(550))
  })

  it('shows the whole description as a plain message, which has the room', () => {
    const asMessage = formatPlace(huge, 'en', MESSAGE_LIMIT, CATALOG)
    const asCaption = formatPlace(huge, 'en', CAPTION_LIMIT, CATALOG)
    expect(asMessage).toContain(long(900))
    expect(asMessage.length).toBeGreaterThan(asCaption.length)
  })

  it('cuts only when there is nothing left to give up', () => {
    const absurd = place({ name: long(2000), amenities: ['wifi'] })
    const text = formatPlace(absurd, 'en', CAPTION_LIMIT, CATALOG)
    expect(text.length).toBeLessThanOrEqual(CAPTION_LIMIT)
    expect(text.endsWith('…')).toBe(true)
  })
})
