import { WEEKDAYS, type OpeningHours, type Place } from '@place-map/shared'
import { escapeHtml } from './telegram.js'
import { dayLabels, strings } from './strings.js'

/** Telegram's caption limit is 1024 characters; plain messages get 4096. */
export const CAPTION_LIMIT = 1024
export const MESSAGE_LIMIT = 4096

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`
}

/**
 * Collapses consecutive days that share hours: seven lines become
 * "Mon-Fri 09:00-18:00 / Sat 10:00-14:00, 16:00-22:00 / Sun closed".
 * A caption has 1024 characters to hold the name, description and address too,
 * so the uncollapsed version genuinely does not fit.
 */
export function formatHours(hours: OpeningHours | null, lang: string): string | null {
  if (!hours) return null

  const t = strings(lang)
  const labels = dayLabels(lang)

  const days = WEEKDAYS.map((day) => {
    const ranges = hours[day]
    const text =
      ranges && ranges.length > 0
        ? ranges.map(([open, close]) => `${open}-${close}`).join(', ')
        : t.closed
    return { day, text }
  })

  if (days.every((d) => d.text === t.closed)) return null

  const groups: { first: string; last: string; text: string }[] = []

  for (const { day, text } of days) {
    const previous = groups[groups.length - 1]
    if (previous && previous.text === text) {
      previous.last = day
    } else {
      groups.push({ first: day, last: day, text })
    }
  }

  return groups
    .map((group) => {
      const span =
        group.first === group.last
          ? labels[group.first]
          : `${labels[group.first]}-${labels[group.last]}`
      return `${span} ${group.text}`
    })
    .join('\n')
}

/**
 * The detail screen's body. Used as a photo caption when the place has an
 * image and as message text when it does not, so it is built against the
 * tighter of the two limits.
 */
export function formatPlace(place: Place, lang: string, limit = CAPTION_LIMIT): string {
  const t = strings(lang)
  const lines: string[] = []

  lines.push(`<b>${escapeHtml(place.name)}</b>`)
  lines.push(
    place.category.icon
      ? `${place.category.icon} ${escapeHtml(place.category.name)}`
      : escapeHtml(place.category.name),
  )

  if (place.description) {
    lines.push('', escapeHtml(truncate(place.description, 400)))
  }

  const facts: string[] = []
  if (place.address) facts.push(`📍 ${escapeHtml(place.address)}`)
  if (place.phone) facts.push(`📞 ${escapeHtml(place.phone)}`)
  if (facts.length > 0) lines.push('', ...facts)

  const hours = formatHours(place.opening_hours, lang)
  if (hours) {
    lines.push('', `<b>${escapeHtml(t.hours)}</b>`, `<code>${escapeHtml(hours)}</code>`)
  }

  return truncate(lines.join('\n'), limit)
}
