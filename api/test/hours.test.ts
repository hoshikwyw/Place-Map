import { describe, expect, it } from 'vitest'
import { groupHours, isOpenAt, to12Hour } from '@place-map/shared'

/**
 * Yangon is UTC+6:30 with no daylight saving. The half-hour offset makes it a
 * sharper test than a whole-hour zone: code that rounds or truncates the
 * offset gets the answer wrong here.
 */
const TZ = 'Asia/Yangon'

const weekdays = {
  mon: [['09:00', '18:00']],
  tue: [['09:00', '18:00']],
  wed: [['09:00', '18:00']],
  thu: [['09:00', '18:00']],
  fri: [['09:00', '18:00']],
  sat: [
    ['10:00', '14:00'],
    ['16:00', '22:00'],
  ],
  sun: [],
} as Record<string, [string, string][]>

/** 2026-09-07 is a Monday. `hhmm` is Yangon local time. */
const yangon = (day: number, hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  // Date.UTC normalises negative minutes, so subtracting 6:30 is safe.
  return new Date(Date.UTC(2026, 8, 7 + day, h! - 6, m! - 30))
}

describe('groupHours', () => {
  it('collapses consecutive identical days', () => {
    expect(groupHours(weekdays)?.map((g) => `${g.first}-${g.last}`)).toEqual([
      'mon-fri',
      'sat-sat',
      'sun-sun',
    ])
  })

  it('returns null for missing or all-closed data', () => {
    expect(groupHours(null)).toBeNull()
    expect(groupHours({})).toBeNull()
    expect(groupHours({ mon: [], tue: [] })).toBeNull()
  })
})

describe('isOpenAt', () => {
  it('is open inside a range and reports the closing time', () => {
    expect(isOpenAt(weekdays, yangon(0, '10:30'), TZ)).toEqual({ open: true, closesAt: '18:00' })
  })

  it('treats closing time as closed', () => {
    expect(isOpenAt(weekdays, yangon(0, '18:00'), TZ)?.open).toBe(false)
  })

  it('is closed in the gap of a split shift', () => {
    expect(isOpenAt(weekdays, yangon(5, '15:00'), TZ)?.open).toBe(false)
    expect(isOpenAt(weekdays, yangon(5, '16:30'), TZ)).toEqual({ open: true, closesAt: '22:00' })
  })

  it('is closed on a day with no ranges', () => {
    expect(isOpenAt(weekdays, yangon(6, '12:00'), TZ)?.open).toBe(false)
  })

  it('evaluates in the place time zone, not UTC', () => {
    // 03:00 UTC Monday is 09:30 in Yangon: open there, though a UTC clock
    // would say it is before opening.
    const instant = new Date(Date.UTC(2026, 8, 7, 3, 0))
    expect(isOpenAt(weekdays, instant, TZ)?.open).toBe(true)
    expect(isOpenAt(weekdays, instant, 'UTC')?.open).toBe(false)
  })

  it('honours the half-hour offset', () => {
    // 02:45 UTC is 09:15 in Yangon - open. An offset rounded to +6h would make
    // it 08:45, before opening.
    expect(isOpenAt(weekdays, new Date(Date.UTC(2026, 8, 7, 2, 45)), TZ)?.open).toBe(true)
    // 02:15 UTC is 08:45 in Yangon - not yet open.
    expect(isOpenAt(weekdays, new Date(Date.UTC(2026, 8, 7, 2, 15)), TZ)?.open).toBe(false)
  })

  it('returns null when no hours are known, so no badge is shown', () => {
    expect(isOpenAt(null, new Date(), TZ)).toBeNull()
  })
})

describe('reading a stored time as a clock', () => {
  const clock = (s: string) => to12Hour(s)

  it('reads a morning time', () => {
    expect(clock('09:00')).toEqual({ hour: 9, minute: 0, meridiem: 'am' })
  })

  it('reads an afternoon time', () => {
    expect(clock('18:30')).toEqual({ hour: 6, minute: 30, meridiem: 'pm' })
  })

  it('calls midnight 12 AM, not 0', () => {
    expect(clock('00:00')).toEqual({ hour: 12, minute: 0, meridiem: 'am' })
    expect(clock('00:45')).toEqual({ hour: 12, minute: 45, meridiem: 'am' })
  })

  it('calls noon 12 PM, not 0', () => {
    expect(clock('12:00')).toEqual({ hour: 12, minute: 0, meridiem: 'pm' })
  })

  it('keeps 12:59 in the afternoon and 13:00 just after it', () => {
    expect(clock('12:59')?.meridiem).toBe('pm')
    expect(clock('13:00')).toEqual({ hour: 1, minute: 0, meridiem: 'pm' })
  })

  it('reads the last minute of the day', () => {
    expect(clock('23:59')).toEqual({ hour: 11, minute: 59, meridiem: 'pm' })
  })

  it('accepts a single-digit hour, which the editor can produce', () => {
    expect(clock('9:05')).toEqual({ hour: 9, minute: 5, meridiem: 'am' })
  })

  it('refuses an hour that cannot exist', () => {
    expect(clock('24:00')).toBeNull()
    expect(clock('99:00')).toBeNull()
  })

  it('refuses a minute that cannot exist', () => {
    expect(clock('10:60')).toBeNull()
  })

  it('refuses anything that is not a time', () => {
    expect(clock('')).toBeNull()
    expect(clock('evening')).toBeNull()
    expect(clock('10')).toBeNull()
    expect(clock('10:5')).toBeNull()
  })
})
