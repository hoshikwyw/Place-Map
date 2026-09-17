import { WEEKDAYS, type Weekday } from '@place-map/shared'

/**
 * FormData is all strings. These translate a submitted form into the shapes the
 * write schemas expect, so a field left blank means "no value" rather than an
 * empty string written over real data.
 */

export const LOCALES: string[] = (process.env.LOCALES ?? 'en,my')
  .split(',')
  .map((locale) => locale.trim())
  .filter(Boolean)

/** `""` is never a meaningful value for these columns; `null` is. */
export function text(form: FormData, key: string): string | null {
  const value = form.get(key)
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

export function number(form: FormData, key: string): number | null {
  const value = text(form, key)
  if (value === null) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/** An unchecked checkbox submits nothing at all, which is how HTML says false. */
export function checkbox(form: FormData, key: string): boolean {
  return form.get(key) !== null
}

/**
 * Collects `name.en`, `name.my`, ... into `{en: ..., my: ...}`, dropping blanks
 * so a locale nobody filled in is absent rather than an empty string that would
 * render as a blank name in that language.
 */
export function localized(form: FormData, prefix: string): Record<string, string> | null {
  const result: Record<string, string> = {}

  for (const locale of LOCALES) {
    const value = text(form, `${prefix}.${locale}`)
    if (value) result[locale] = value
  }

  return Object.keys(result).length > 0 ? result : null
}

// -------------------------------------------------------------- opening hours

/**
 * One text field per day rather than a grid of time pickers: "09:00-18:00" is
 * faster to type than four dropdowns, and split shifts are just a comma.
 *
 * Blank means closed, which is also what an empty array means in the database.
 */
export function hoursToText(
  hours: Record<string, [string, string][]> | null | undefined,
  day: Weekday,
): string {
  const ranges = hours?.[day]
  if (!ranges || ranges.length === 0) return ''
  return ranges.map(([open, close]) => `${open}-${close}`).join(', ')
}

export class HoursParseError extends Error {}

function parseDay(raw: string, day: Weekday): [string, string][] {
  if (raw.trim() === '') return []

  return raw.split(',').map((part) => {
    const [open, close] = part.split('-').map((piece) => piece.trim())
    if (!open || !close) {
      throw new HoursParseError(`${day}: use "09:00-18:00", or leave blank for closed`)
    }
    return [open, close] as [string, string]
  })
}

/**
 * Returns null when every day is blank - a place with no hours recorded is
 * different from one recorded as closed all week, and the API drops the whole
 * section for the former.
 */
export function hours(form: FormData): Record<string, [string, string][]> | null {
  const result: Record<string, [string, string][]> = {}
  let anyFilled = false

  for (const day of WEEKDAYS) {
    const raw = form.get(`hours.${day}`)
    const ranges = parseDay(typeof raw === 'string' ? raw : '', day)
    result[day] = ranges
    if (ranges.length > 0) anyFilled = true
  }

  return anyFilled ? result : null
}
