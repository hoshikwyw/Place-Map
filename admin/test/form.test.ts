import { describe, expect, it } from 'vitest'
import {
  HoursParseError,
  amenities,
  checkbox,
  hours,
  links,
  localized,
  number,
  text,
} from '@/lib/form'

/**
 * FormData is all strings, and this is where those strings become the values
 * written over a real place.
 *
 * The distinction that matters throughout: a field left blank means "no value",
 * not an empty string. Getting that backwards writes `""` over somebody's phone
 * number and the dashboard shows it as saved.
 */

const form = (entries: Record<string, string | string[]>) => {
  const data = new FormData()
  for (const [key, value] of Object.entries(entries)) {
    for (const one of Array.isArray(value) ? value : [value]) data.append(key, one)
  }
  return data
}

describe('text', () => {
  it('reads a value', () => {
    expect(text(form({ name: 'Cafe Central' }), 'name')).toBe('Cafe Central')
  })

  it('trims it', () => {
    expect(text(form({ name: '  Cafe Central  ' }), 'name')).toBe('Cafe Central')
  })

  it('reads a blank field as no value, not as an empty string', () => {
    expect(text(form({ phone: '' }), 'phone')).toBeNull()
    expect(text(form({ phone: '   ' }), 'phone')).toBeNull()
  })

  it('reads a missing field as no value', () => {
    expect(text(form({}), 'phone')).toBeNull()
  })

  it('keeps a zero, which is a real value', () => {
    expect(text(form({ sort_order: '0' }), 'sort_order')).toBe('0')
  })
})

describe('number', () => {
  it('reads a number', () => {
    expect(number(form({ sort_order: '42' }), 'sort_order')).toBe(42)
  })

  it('reads zero as zero, not as nothing', () => {
    // `0` is falsy, which is exactly the bug this guards.
    expect(number(form({ sort_order: '0' }), 'sort_order')).toBe(0)
  })

  it('reads a negative number', () => {
    expect(number(form({ lat: '-16.8' }), 'lat')).toBe(-16.8)
  })

  it('reads a blank field as no value', () => {
    expect(number(form({ price_min: '' }), 'price_min')).toBeNull()
  })

  it('refuses something that is not a number', () => {
    expect(number(form({ price_min: 'free' }), 'price_min')).toBeNull()
  })

  it('refuses infinity, which Number() happily returns', () => {
    expect(number(form({ price_min: 'Infinity' }), 'price_min')).toBeNull()
  })
})

describe('checkbox', () => {
  it('is true when ticked', () => {
    expect(checkbox(form({ is_active: 'on' }), 'is_active')).toBe(true)
  })

  it('is false when absent, which is how HTML says unticked', () => {
    expect(checkbox(form({}), 'is_active')).toBe(false)
  })

  it('is true even for a value of "false", because presence is the signal', () => {
    expect(checkbox(form({ is_active: 'false' }), 'is_active')).toBe(true)
  })
})

describe('localized', () => {
  it('collects one field per language', () => {
    expect(localized(form({ 'name.en': 'Cafes', 'name.my': 'ကော်ဖီဆိုင်များ' }), 'name')).toEqual({
      en: 'Cafes',
      my: 'ကော်ဖီဆိုင်များ',
    })
  })

  it('leaves out a language nobody filled in', () => {
    // Absent, not empty: the API falls back to another language for a missing
    // name, but renders an empty string as a blank name.
    expect(localized(form({ 'name.en': 'Cafes', 'name.my': '' }), 'name')).toEqual({ en: 'Cafes' })
  })

  it('is null when every language is blank', () => {
    expect(localized(form({ 'name.en': '', 'name.my': '' }), 'name')).toBeNull()
  })

  it('ignores a language the dashboard is not configured for', () => {
    expect(localized(form({ 'name.en': 'Cafes', 'name.fr': 'Cafés' }), 'name')).toEqual({
      en: 'Cafes',
    })
  })
})

describe('links', () => {
  const one = [{ type: 'facebook', url: 'https://facebook.com/x', label: null }]

  it('reads the JSON the editor submits', () => {
    expect(links(form({ links: JSON.stringify(one) }))).toEqual(one)
  })

  it('reads an absent field as no links', () => {
    expect(links(form({}))).toEqual([])
  })

  it('reads a blank field as no links', () => {
    expect(links(form({ links: '   ' }))).toEqual([])
  })

  it('treats unparsable JSON as no links rather than failing the save', () => {
    // The rest of the form is somebody's work; losing it to a broken hidden
    // field would be worse than losing the links.
    expect(links(form({ links: '{not json' }))).toEqual([])
  })

  it('treats a non-array as no links', () => {
    expect(links(form({ links: '{"type":"facebook"}' }))).toEqual([])
  })

  it('drops an entry that is not a valid link, keeping the rest', () => {
    const mixed = JSON.stringify([...one, { type: 'not-a-platform', url: 'nonsense' }])
    expect(links(form({ links: mixed }))).toEqual(one)
  })
})

describe('amenities', () => {
  it('collects every ticked box', () => {
    expect(amenities(form({ amenities: ['wifi', 'parking'] }))).toEqual(['wifi', 'parking'])
  })

  it('is empty when nothing is ticked', () => {
    expect(amenities(form({}))).toEqual([])
  })

  it('drops duplicates', () => {
    expect(amenities(form({ amenities: ['wifi', 'wifi'] }))).toEqual(['wifi'])
  })

  it('drops blanks', () => {
    expect(amenities(form({ amenities: ['wifi', '', '  '] }))).toEqual(['wifi'])
  })

  it('keeps a slug the dashboard has never heard of', () => {
    // Which slugs exist is the API's business. Dropping an unknown one here
    // would silently discard a tick the operator made.
    expect(amenities(form({ amenities: ['brand_new'] }))).toEqual(['brand_new'])
  })
})

describe('opening hours', () => {
  const week = (over: Record<string, string> = {}) =>
    form({
      'hours.mon': '',
      'hours.tue': '',
      'hours.wed': '',
      'hours.thu': '',
      'hours.fri': '',
      'hours.sat': '',
      'hours.sun': '',
      ...over,
    })

  it('reads one range', () => {
    expect(hours(week({ 'hours.mon': '09:00-18:00' }))?.mon).toEqual([['09:00', '18:00']])
  })

  it('reads two ranges in a day', () => {
    expect(hours(week({ 'hours.sat': '10:00-14:00, 16:00-22:00' }))?.sat).toEqual([
      ['10:00', '14:00'],
      ['16:00', '22:00'],
    ])
  })

  it('reads a blank day as closed', () => {
    expect(hours(week({ 'hours.mon': '09:00-18:00' }))?.sun).toEqual([])
  })

  it('returns every day, not only the filled ones', () => {
    expect(Object.keys(hours(week({ 'hours.mon': '09:00-18:00' })) ?? {})).toEqual([
      'mon',
      'tue',
      'wed',
      'thu',
      'fri',
      'sat',
      'sun',
    ])
  })

  it('is null when no day is filled in', () => {
    // A place with no hours recorded is a different thing from one recorded as
    // closed all week, and the API drops the whole section for the former.
    expect(hours(week())).toBeNull()
  })

  it('tolerates spacing around a range', () => {
    expect(hours(week({ 'hours.mon': '  09:00 - 18:00  ' }))?.mon).toEqual([['09:00', '18:00']])
  })

  it('names the day when a range is unusable', () => {
    expect(() => hours(week({ 'hours.wed': '09:00' }))).toThrow(HoursParseError)
    expect(() => hours(week({ 'hours.wed': '09:00' }))).toThrow(/wed/)
  })

  it('refuses a range missing its opening time', () => {
    expect(() => hours(week({ 'hours.mon': '-18:00' }))).toThrow(HoursParseError)
  })

  it('refuses a trailing comma, which leaves an empty range', () => {
    expect(() => hours(week({ 'hours.mon': '09:00-18:00,' }))).toThrow(HoursParseError)
  })
})
