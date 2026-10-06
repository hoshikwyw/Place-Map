import { describe, expect, it } from 'vitest'
import type { Category, PlaceSummary } from '@place-map/shared'
import {
  ALL_CATEGORIES,
  categoriesKeyboard,
  decode,
  encode,
  nearbyKeyboard,
  placeKeyboard,
  placesKeyboard,
} from '../src/bot/keyboards'
import { formatHours, formatRating } from '../src/bot/format'
import { escapeHtml } from '../src/bot/telegram'
import type { NearbyPlace } from '@place-map/shared'

const bytes = (value: string) => new TextEncoder().encode(value).length

describe('callback_data codec', () => {
  it('round-trips every action', () => {
    const actions = [
      { type: 'home' } as const,
      { type: 'nop' } as const,
      { type: 'category', id: 3, page: 1 } as const,
      { type: 'place', id: 42, categoryId: 3, page: 7 } as const,
    ]
    for (const action of actions) {
      expect(decode(encode(action))).toEqual(action)
    }
  })

  it('round-trips a shared point, rounded to about 11 metres', () => {
    const at = { lat: 16.7761234, lng: 96.1603456 }
    const decoded = decode(encode({ type: 'nearby', categoryId: 2, at, page: 3 }))
    expect(decoded).toEqual({
      type: 'nearby',
      categoryId: 2,
      at: { lat: 16.7761, lng: 96.1603 },
      page: 3,
    })
  })

  it('round-trips a place opened from a nearby list', () => {
    const action = {
      type: 'nearPlace',
      id: 12,
      categoryId: ALL_CATEGORIES,
      at: { lat: -16.5, lng: -96.25 },
      page: 2,
    } as const
    expect(decode(encode(action))).toEqual(action)
  })

  it('refuses coordinates that are out of range or not numbers', () => {
    // These arrive from the client and go on to a database query.
    for (const data of [
      'n:0:91:96:1',
      'n:0:16.7:181:1',
      'n:0:abc:96.1:1',
      'n:0::96.1:1',
      'n:-1:16.7:96.1:1',
      'pn:1:0:16.7:96.1:0',
      'n:0:16.7:96.1',
    ]) {
      expect(decode(data)).toBeNull()
    }
  })

  it('stays inside Telegram s 64-byte cap at implausible ids', () => {
    // Telegram silently rejects the whole keyboard if one button is over.
    const worst = encode({ type: 'place', id: 999999999, categoryId: 999999, page: 99999 })
    expect(bytes(worst)).toBeLessThanOrEqual(64)

    // The longest button the bot can build: a place, its category and a point
    // in the far south-west, all in one callback.
    const withPoint = encode({
      type: 'nearPlace',
      id: 999999999,
      categoryId: 999999,
      at: { lat: -89.9999, lng: -179.9999 },
      page: 99999,
    })
    expect(bytes(withPoint)).toBeLessThanOrEqual(64)
  })

  it('rejects malformed or hostile data instead of coercing it', () => {
    for (const data of [
      undefined,
      '',
      'p:abc:1:1',
      'c:3',
      'c:3:0', // pages are 1-based
      'p:1:2', // old 3-part form
      'x:1',
      'home:1',
    ]) {
      expect(decode(data)).toBeNull()
    }
  })
})

describe('keyboards', () => {
  const category = (id: number, name: string): Category => ({
    id,
    slug: `c${id}`,
    name,
    icon: null,
  })

  const place = (id: number): PlaceSummary => ({
    id,
    slug: `p${id}`,
    category: category(3, 'Cafes'),
    name: `Place ${id}`,
    description: null,
    address: null,
    location: null,
    phone: null,
    website: null,
    opening_hours: null,
    image: null,
    links: [],
    rating: null,
    rating_count: 0,
  })

  it('lays categories out two per row, with an odd one left alone', () => {
    const rows = categoriesKeyboard([1, 2, 3].map((id) => category(id, `C${id}`))).inline_keyboard
    expect(rows.map((row) => row.length)).toEqual([2, 1])
  })

  it('omits the pager entirely when there is one page', () => {
    const rows = placesKeyboard([place(1), place(2)], 3, 1, 1, 'en').inline_keyboard
    expect(rows).toHaveLength(3) // two places + the Categories row
  })

  it('hides Prev on the first page and Next on the last', () => {
    const first = placesKeyboard([place(1)], 3, 1, 4, 'en').inline_keyboard[1]!
    expect(first.map((b) => b.text)).toEqual(['1/4', 'Next »'])

    const last = placesKeyboard([place(1)], 3, 4, 4, 'en').inline_keyboard[1]!
    expect(last.map((b) => b.text)).toEqual(['« Prev', '4/4'])
  })

  it('makes each place remember the page it was opened from', () => {
    const button = placesKeyboard([place(9)], 3, 5, 9, 'en').inline_keyboard[0]![0]!
    expect(decode(button.callback_data)).toEqual({
      type: 'place',
      id: 9,
      categoryId: 3,
      page: 5,
    })
  })

  it('gives the page counter a callback so tapping it does not hang', () => {
    // A button without callback_data cannot be answered, and the client spins.
    const counter = placesKeyboard([place(1)], 3, 2, 4, 'en').inline_keyboard[1]![0]!
    expect(counter.callback_data).toBeDefined()
  })
})

describe('nearby keyboard', () => {
  const category = (id: number, name: string) => ({ id, slug: `c${id}`, name, icon: null })
  const near = (id: number, distance: number | null): NearbyPlace => ({
    id,
    slug: `p${id}`,
    category: category(3, 'Cafes'),
    name: `Place ${id}`,
    description: null,
    address: null,
    location: null,
    phone: null,
    website: null,
    opening_hours: null,
    image: null,
    links: [],
    rating: null,
    rating_count: 0,
    distance_m: distance,
  })
  const at = { lat: 16.7761, lng: 96.1603 }
  const categories = [category(1, 'Cafes'), category(2, 'Parks')]

  it('puts the distance on each button - the reason this list exists', () => {
    const rows = nearbyKeyboard([near(1, 350), near(2, 2400)], categories, ALL_CATEGORIES, at, 1, 1, 'en')
      .inline_keyboard
    expect(rows[0]![0]!.text).toBe('Place 1 · 350 m')
    expect(rows[1]![0]!.text).toBe('Place 2 · 2.4 km')
  })

  it('writes the distance in Myanmar when the chat is Myanmar', () => {
    const rows = nearbyKeyboard([near(1, 350)], categories, ALL_CATEGORIES, at, 1, 1, 'my').inline_keyboard
    expect(rows[0]![0]!.text).toBe('Place 1 · 350 မီတာ')
    expect(rows.at(-1)![0]!.text).toBe('⌂ အမျိုးအစားများ')
  })

  it('carries the point into every button, so nothing is stored server-side', () => {
    const rows = nearbyKeyboard([near(1, 100)], categories, ALL_CATEGORIES, at, 1, 2, 'en').inline_keyboard
    for (const button of rows.flat()) {
      const action = decode(button.callback_data)
      if (action && (action.type === 'nearby' || action.type === 'nearPlace')) {
        expect(action.at).toEqual(at)
      }
    }
  })

  it('offers the other categories, and "All" only once something is filtered', () => {
    const unfiltered = nearbyKeyboard([near(1, 10)], categories, ALL_CATEGORIES, at, 1, 1, 'en')
      .inline_keyboard.flat()
      .map((b) => b.text)
    expect(unfiltered).toContain('Cafes')
    expect(unfiltered).toContain('Parks')
    expect(unfiltered).not.toContain('All')

    const filtered = nearbyKeyboard([near(1, 10)], categories, 1, at, 1, 1, 'en')
      .inline_keyboard.flat()
      .map((b) => b.text)
    expect(filtered).toContain('All')
    // The category in use is not offered again.
    expect(filtered).not.toContain('Cafes')
    expect(filtered).toContain('Parks')
  })

  it('pages the point rather than the question', () => {
    const nav = nearbyKeyboard([near(1, 10)], categories, ALL_CATEGORIES, at, 2, 3, 'en')
      .inline_keyboard[1]!
    expect(nav.map((b) => b.text)).toEqual(['« Prev', '2/3', 'Next »'])
    expect(decode(nav[2]!.callback_data)).toEqual({
      type: 'nearby',
      categoryId: ALL_CATEGORIES,
      at,
      page: 3,
    })
  })
})

describe('place keyboard links', () => {
  const base = { location: null, website: null }
  const texts = (markup: { inline_keyboard: { text: string }[][] }) =>
    markup.inline_keyboard.flat().map((b) => b.text)

  it('shows every link the place has, not just a website', () => {
    const markup = placeKeyboard(
      {
        ...base,
        links: [
          { type: 'website', url: 'https://a.test', label: null },
          { type: 'facebook', url: 'https://fb.test', label: null },
          { type: 'other', url: 'https://x.test', label: 'Menu' },
        ],
      },
      { type: 'home' },
      'en',
    )
    expect(texts(markup)).toEqual(
      expect.arrayContaining(['🌐 Website', 'f Facebook', '🔗 Menu']),
    )
  })

  it('still understands a place that only has the old single website', () => {
    const markup = placeKeyboard({ location: null, website: 'https://a.test' }, { type: 'home' }, 'en')
    expect(texts(markup)).toContain('🌐 Website')
  })

  it('sends Back wherever the caller came from', () => {
    const fromNearby = placeKeyboard(
      base,
      { type: 'nearby', categoryId: 0, at: { lat: 1, lng: 2 }, page: 2 },
      'en',
    )
    const back = fromNearby.inline_keyboard.at(-1)![0]!
    expect(decode(back.callback_data)).toMatchObject({ type: 'nearby', page: 2 })
  })

  it('offers a map link only when the place has a location', () => {
    expect(texts(placeKeyboard(base, { type: 'home' }, 'en'))).not.toContain('📍 Map')
    const located = placeKeyboard({ ...base, location: { lat: 16.8, lng: 96.1 } }, { type: 'home' }, 'en')
    expect(texts(located)).toContain('📍 Map')
  })
})

describe('formatRating', () => {
  it('shows an average and how many ratings it rests on', () => {
    expect(formatRating({ rating: 4.63, rating_count: 128 }, 'en')).toBe('⭐ 4.6 (128 ratings)')
    expect(formatRating({ rating: 5, rating_count: 1 }, 'en')).toBe('⭐ 5.0 (1 rating)')
    expect(formatRating({ rating: 4.6, rating_count: 2 }, 'my')).toBe('⭐ 4.6 (အဆင့်သတ်မှတ်ချက် 2 ခု)')
  })

  it('shows nothing until a place has actually been rated', () => {
    expect(formatRating({ rating: null, rating_count: 0 }, 'en')).toBeNull()
    expect(formatRating({ rating: 4.5, rating_count: 0 }, 'en')).toBeNull()
    // Responses cached before the ratings migration carry neither field.
    expect(formatRating({}, 'en')).toBeNull()
  })
})

describe('formatHours', () => {
  const week = (hours: Record<string, [string, string][]>) => formatHours(hours, 'en')

  it('collapses consecutive identical days into a range', () => {
    expect(
      week({
        mon: [['09:00', '18:00']],
        tue: [['09:00', '18:00']],
        wed: [['09:00', '18:00']],
        thu: [['09:00', '18:00']],
        fri: [['09:00', '18:00']],
        sat: [['10:00', '14:00']],
        sun: [],
      }),
    ).toBe('Mon-Fri 09:00-18:00\nSat 10:00-14:00\nSun closed')
  })

  it('keeps split shifts on one line', () => {
    expect(
      week({
        mon: [
          ['10:00', '14:00'],
          ['16:00', '22:00'],
        ],
      }),
    ).toContain('Mon 10:00-14:00, 16:00-22:00')
  })

  it('treats a missing day as closed', () => {
    expect(week({ mon: [['09:00', '18:00']] })).toBe('Mon 09:00-18:00\nTue-Sun closed')
  })

  it('returns null when nothing is known, so the section is dropped', () => {
    expect(formatHours(null, 'en')).toBeNull()
    expect(week({})).toBeNull()
  })

  it('translates the day labels and the closed label', () => {
    expect(formatHours({ mon: [['09:00', '18:00']] }, 'my')).toBe('တနင်္လာ 09:00-18:00\nအင်္ဂါ-တနင်္ဂနွေ ပိတ်')
  })
})

describe('escapeHtml', () => {
  it('neutralises markup in place names before parse_mode HTML', () => {
    expect(escapeHtml('Bob & Sons <script>')).toBe('Bob &amp; Sons &lt;script&gt;')
  })

  it('leaves quotes alone, which Telegram would otherwise show as entities', () => {
    // Nothing here builds an HTML attribute, so a quote is just a quote.
    expect(escapeHtml("I'll find cafes")).toBe("I'll find cafes")
    expect(escapeHtml('He said "hi"')).toBe('He said "hi"')
  })
})
