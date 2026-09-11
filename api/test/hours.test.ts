import { describe, expect, it } from 'vitest'
import { groupHours, isOpenAt } from '@place-map/shared'

const TZ = 'Asia/Tashkent' // UTC+5, no DST

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

/** 2026-09-07 is a Monday. `hhmm` is Tashkent local time. */
const tashkent = (day: number, hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return new Date(Date.UTC(2026, 8, 7 + day, h! - 5, m!))
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
    expect(isOpenAt(weekdays, tashkent(0, '10:30'), TZ)).toEqual({ open: true, closesAt: '18:00' })
  })

  it('treats closing time as closed', () => {
    expect(isOpenAt(weekdays, tashkent(0, '18:00'), TZ)?.open).toBe(false)
  })

  it('is closed in the gap of a split shift', () => {
    expect(isOpenAt(weekdays, tashkent(5, '15:00'), TZ)?.open).toBe(false)
    expect(isOpenAt(weekdays, tashkent(5, '16:30'), TZ)).toEqual({ open: true, closesAt: '22:00' })
  })

  it('is closed on a day with no ranges', () => {
    expect(isOpenAt(weekdays, tashkent(6, '12:00'), TZ)?.open).toBe(false)
  })

  it('evaluates in the place time zone, not UTC', () => {
    // 04:30 UTC Monday is 09:30 in Tashkent: open there, though a UTC clock
    // would say it is before opening.
    const instant = new Date(Date.UTC(2026, 8, 7, 4, 30))
    expect(isOpenAt(weekdays, instant, TZ)?.open).toBe(true)
    expect(isOpenAt(weekdays, instant, 'UTC')?.open).toBe(false)
  })

  it('returns null when no hours are known, so no badge is shown', () => {
    expect(isOpenAt(null, new Date(), TZ)).toBeNull()
  })
})
