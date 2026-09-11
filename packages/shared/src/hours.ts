import { WEEKDAYS, type OpeningHours, type Weekday } from './domain'

/**
 * Opening-hours logic every client needs - the bot's caption, the web page's
 * hours table, the app's "open now" badge. Kept here so the three cannot
 * disagree about whether a place is open.
 */

export interface HoursGroup {
  first: Weekday
  last: Weekday
  /** Empty means closed on every day in the group. */
  ranges: [string, string][]
}

const sameRanges = (a: [string, string][], b: [string, string][]) =>
  a.length === b.length && a.every(([open, close], i) => b[i]?.[0] === open && b[i]?.[1] === close)

/**
 * Collapses consecutive days with identical hours: seven rows become
 * "Mon-Fri 09:00-18:00 / Sat 10:00-14:00 / Sun closed".
 *
 * Returns null when nothing useful is recorded - no hours at all, or closed
 * every day - so callers can drop the section rather than print a week of
 * "closed" that is more likely missing data than a truly shut place.
 * A missing day counts as closed.
 */
export function groupHours(hours: OpeningHours | null | undefined): HoursGroup[] | null {
  if (!hours) return null

  const days = WEEKDAYS.map((day) => ({ day, ranges: hours[day] ?? [] }))
  if (days.every((d) => d.ranges.length === 0)) return null

  const groups: HoursGroup[] = []
  for (const { day, ranges } of days) {
    const previous = groups[groups.length - 1]
    if (previous && sameRanges(previous.ranges, ranges)) {
      previous.last = day
    } else {
      groups.push({ first: day, last: day, ranges })
    }
  }
  return groups
}

export interface OpenState {
  open: boolean
  /** "18:00" while open, so a client can say "closes at 18:00". */
  closesAt: string | null
}

const WEEKDAY_BY_SHORT: Record<string, Weekday> = {
  Mon: 'mon',
  Tue: 'tue',
  Wed: 'wed',
  Thu: 'thu',
  Fri: 'fri',
  Sat: 'sat',
  Sun: 'sun',
}

/**
 * Whether a place is open at `now`, evaluated in the *place's* time zone.
 *
 * The zone matters more than it looks: a server runs in UTC and a visitor's
 * browser runs wherever they are, and both are wrong for "is this cafe in
 * Tashkent open right now". Times compare as "HH:MM" strings, which order
 * correctly because they are zero-padded.
 *
 * Ranges never cross midnight - the write schema requires open < close - so a
 * late venue records "18:00-23:59" and "00:00-02:00" on the next day.
 */
export function isOpenAt(
  hours: OpeningHours | null | undefined,
  now: Date,
  timeZone: string,
): OpenState | null {
  if (!groupHours(hours)) return null

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)

  const pick = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  const day = WEEKDAY_BY_SHORT[pick('weekday')]
  const time = `${pick('hour')}:${pick('minute')}`
  if (!day) return null

  const current = (hours?.[day] ?? []).find(([open, close]) => time >= open && time < close)
  return current ? { open: true, closesAt: current[1] } : { open: false, closesAt: null }
}
