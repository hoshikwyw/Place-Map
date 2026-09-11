import { groupHours, type OpeningHours, type Place } from '@place-map/shared'
import { escapeHtml } from './telegram.js'
import { dayLabels, strings } from './strings.js'

/** Telegram's caption limit is 1024 characters; plain messages get 4096. */
export const CAPTION_LIMIT = 1024
export const MESSAGE_LIMIT = 4096

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`
}

/**
 * "Mon-Fri 09:00-18:00 / Sat 10:00-14:00, 16:00-22:00 / Sun closed".
 * The grouping itself lives in @place-map/shared so the bot, the web page and
 * the app agree; this only renders it in the bot's words. A caption has 1024
 * characters to hold everything else too, so the collapsed form is not
 * cosmetic - seven lines genuinely do not fit.
 */
export function formatHours(hours: OpeningHours | null, lang: string): string | null {
  const groups = groupHours(hours)
  if (!groups) return null

  const t = strings(lang)
  const labels = dayLabels(lang)

  return groups
    .map(({ first, last, ranges }) => {
      const span = first === last ? labels[first] : `${labels[first]}-${labels[last]}`
      const text = ranges.length ? ranges.map(([open, close]) => `${open}-${close}`).join(', ') : t.closed
      return `${span} ${text}`
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
