import { describe, expect, it } from 'vitest'
import type { Category, PlaceSummary } from '@place-map/shared'
import { categoriesKeyboard, decode, encode, placesKeyboard } from '../src/bot/keyboards'
import { formatHours } from '../src/bot/format'
import { escapeHtml } from '../src/bot/telegram'

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

  it('stays inside Telegram s 64-byte cap at implausible ids', () => {
    // Telegram silently rejects the whole keyboard if one button is over.
    const worst = encode({ type: 'place', id: 999999999, categoryId: 999999, page: 99999 })
    expect(bytes(worst)).toBeLessThanOrEqual(64)
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
  })

  it('lays categories out two per row, with an odd one left alone', () => {
    const rows = categoriesKeyboard([1, 2, 3].map((id) => category(id, `C${id}`))).inline_keyboard
    expect(rows.map((row) => row.length)).toEqual([2, 1])
  })

  it('omits the pager entirely when there is one page', () => {
    const rows = placesKeyboard([place(1), place(2)], 3, 1, 1).inline_keyboard
    expect(rows).toHaveLength(3) // two places + the Categories row
  })

  it('hides Prev on the first page and Next on the last', () => {
    const first = placesKeyboard([place(1)], 3, 1, 4).inline_keyboard[1]!
    expect(first.map((b) => b.text)).toEqual(['1/4', 'Next »'])

    const last = placesKeyboard([place(1)], 3, 4, 4).inline_keyboard[1]!
    expect(last.map((b) => b.text)).toEqual(['« Prev', '4/4'])
  })

  it('makes each place remember the page it was opened from', () => {
    const button = placesKeyboard([place(9)], 3, 5, 9).inline_keyboard[0]![0]!
    expect(decode(button.callback_data)).toEqual({
      type: 'place',
      id: 9,
      categoryId: 3,
      page: 5,
    })
  })

  it('gives the page counter a callback so tapping it does not hang', () => {
    // A button without callback_data cannot be answered, and the client spins.
    const counter = placesKeyboard([place(1)], 3, 2, 4).inline_keyboard[1]![0]!
    expect(counter.callback_data).toBeDefined()
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
    expect(formatHours({ mon: [['09:00', '18:00']] }, 'uz')).toBe('Du 09:00-18:00\nSe-Ya yopiq')
  })
})

describe('escapeHtml', () => {
  it('neutralises markup in place names before parse_mode HTML', () => {
    expect(escapeHtml('Bob & Sons <script>')).toBe('Bob &amp; Sons &lt;script&gt;')
  })
})
