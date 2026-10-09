import { describe, expect, it } from 'vitest'
import {
  formatPriceLine,
  formatPriceRange,
  priceLevelLabel,
  priceParts,
  resolveAmenities,
  type Price,
  type PriceWords,
} from '@place-map/shared'

/**
 * The website, the bot and the app all turn one Price into words, and this is
 * the only place that decides how. Tested here rather than in any one client,
 * for the same reason the hours grouping is.
 */

const en: PriceWords = {
  levels: ['Inexpensive', 'Moderate', 'Expensive'],
  money: (value) => `${value.toLocaleString('en-US')} Ks`,
  from: (value) => `From ${value}`,
  upTo: (value) => `Up to ${value}`,
}

const my: PriceWords = {
  levels: ['သက်သာ', 'အလယ်အလတ်', 'စျေးကြီး'],
  money: (value) => `${value.toLocaleString('en-US')} ကျပ်`,
  from: (value) => `${value} မှစ၍`,
  upTo: (value) => `${value} အထိ`,
}

const price = (over: Partial<Price> = {}): Price => ({
  level: null,
  min: null,
  max: null,
  currency: 'MMK',
  ...over,
})

describe('the exact range', () => {
  it('says the unit once, at the end', () => {
    expect(formatPriceRange(price({ min: 3000, max: 8000 }), en)).toBe('3,000–8,000 Ks')
  })

  it('writes one amount when both ends are the same, not a range to itself', () => {
    expect(formatPriceRange(price({ min: 5000, max: 5000 }), en)).toBe('5,000 Ks')
  })

  it('uses an en dash, not a hyphen', () => {
    // A hyphen between two numbers reads as a minus sign.
    expect(formatPriceRange(price({ min: 1000, max: 2000 }), en)).toContain('–')
    expect(formatPriceRange(price({ min: 1000, max: 2000 }), en)).not.toContain('-')
  })

  it('handles a lower bound alone', () => {
    expect(formatPriceRange(price({ min: 1500 }), en)).toBe('From 1,500 Ks')
  })

  it('handles an upper bound alone', () => {
    expect(formatPriceRange(price({ max: 5000 }), en)).toBe('Up to 5,000 Ks')
  })

  it('is null when no amount is known', () => {
    expect(formatPriceRange(price({ level: 2 }), en)).toBeNull()
  })

  it('groups digits the same way in every language', () => {
    // Myanmar writes amounts in ASCII digits with the same separators; only
    // the unit changes.
    expect(formatPriceRange(price({ min: 3000, max: 8000 }), my)).toBe('3,000–8,000 ကျပ်')
  })

  it('shows a free place as zero rather than as nothing', () => {
    expect(formatPriceRange(price({ min: 0, max: 0 }), en)).toBe('0 Ks')
  })
})

describe('the level', () => {
  it('is a word, not a row of symbols', () => {
    expect(priceLevelLabel(price({ level: 2 }), en)).toBe('Moderate')
  })

  it('reads the three levels in order', () => {
    expect([1, 2, 3].map((level) => priceLevelLabel(price({ level: level as 1 }), en))).toEqual([
      'Inexpensive',
      'Moderate',
      'Expensive',
    ])
  })

  it('is null when the place did not say', () => {
    expect(priceLevelLabel(price({ min: 1000 }), en)).toBeNull()
  })
})

describe('both halves together', () => {
  it('returns each half independently', () => {
    expect(priceParts(price({ level: 2, min: 3000, max: 8000 }), en)).toEqual({
      level: 'Moderate',
      range: '3,000–8,000 Ks',
    })
  })

  it('returns a level with no range', () => {
    expect(priceParts(price({ level: 1 }), en)).toEqual({ level: 'Inexpensive', range: null })
  })

  it('returns a range with no level', () => {
    expect(priceParts(price({ min: 2000 }), en)).toEqual({ level: null, range: 'From 2,000 Ks' })
  })

  it('is null for a place with no price at all', () => {
    expect(priceParts(null, en)).toBeNull()
  })

  it('is null for a price row that says nothing', () => {
    // Every field null: a row that exists but carries no information should
    // not render an empty price line.
    expect(priceParts(price(), en)).toBeNull()
  })

  it('survives a response from before the price column existed', () => {
    // The bot and the app are deployed separately from the API, so a client
    // can be newer than the data it is reading.
    expect(priceParts(undefined, en)).toBeNull()
  })
})

describe('one line of plain text', () => {
  it('joins the two halves with a middle dot', () => {
    expect(formatPriceLine(price({ level: 2, min: 3000, max: 8000 }), en)).toBe(
      'Moderate · 3,000–8,000 Ks',
    )
  })

  it('leaves no separator dangling when only one half exists', () => {
    expect(formatPriceLine(price({ level: 3 }), en)).toBe('Expensive')
    expect(formatPriceLine(price({ max: 4000 }), en)).toBe('Up to 4,000 Ks')
  })

  it('takes a different separator for a caller that needs one', () => {
    expect(formatPriceLine(price({ level: 2, min: 3000, max: 8000 }), en, ', ')).toBe(
      'Moderate, 3,000–8,000 Ks',
    )
  })

  it('is null when there is nothing to say', () => {
    expect(formatPriceLine(null, en)).toBeNull()
  })
})

describe('which amenities a place shows', () => {
  const catalog = [
    { id: 1, slug: 'wifi', name: 'Wi-Fi', icon: '📶', icon_image: null },
    { id: 2, slug: 'parking', name: 'Parking', icon: null, icon_image: null },
    { id: 3, slug: 'takeaway', name: 'Takeaway', icon: '🥡', icon_image: null },
  ]

  const slugsOf = (result: { slug: string }[]) => result.map((amenity) => amenity.slug)

  it('reads in catalog order, whatever order the place stored them', () => {
    expect(slugsOf(resolveAmenities(['takeaway', 'wifi'], catalog))).toEqual(['wifi', 'takeaway'])
  })

  it('drops a slug the catalog no longer knows', () => {
    // A place keeps its slugs when an amenity is deleted or renamed. Showing
    // "retired_slug" to a reader is an editing mistake leaking onto a screen.
    expect(slugsOf(resolveAmenities(['wifi', 'retired_slug'], catalog))).toEqual(['wifi'])
  })

  it('returns nothing when every slug is unknown', () => {
    expect(resolveAmenities(['gone', 'also_gone'], catalog)).toEqual([])
  })

  it('returns nothing without a catalog, rather than inventing labels', () => {
    expect(resolveAmenities(['wifi'], [])).toEqual([])
  })

  it('returns nothing for a place with no amenities', () => {
    expect(resolveAmenities([], catalog)).toEqual([])
  })

  it('survives a response from before the amenities column existed', () => {
    expect(resolveAmenities(undefined, catalog)).toEqual([])
    expect(resolveAmenities(null, catalog)).toEqual([])
  })

  it('shows an amenity once even if the place lists it twice', () => {
    expect(slugsOf(resolveAmenities(['wifi', 'wifi'], catalog))).toEqual(['wifi'])
  })
})
