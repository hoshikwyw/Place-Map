import {
  groupHours,
  priceParts,
  resolveAmenities,
  type Amenity,
  type OpeningHours,
  type Place,
  type PriceWords,
} from '@place-map/shared'
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
 * "⭐ 4.6 (128 ratings)". Nothing is shown until a place has been rated, so a
 * new place does not advertise a zero it did not earn.
 */
export function formatRating(
  place: { rating?: number | null; rating_count?: number },
  lang: string,
): string | null {
  const { rating, rating_count: count } = place
  if (typeof rating !== 'number' || !Number.isFinite(rating) || !count) return null
  return `⭐ ${rating.toFixed(1)} (${strings(lang).ratingCount(count)})`
}

/** The bot's own dictionary, in the shape the shared price formatter wants. */
function priceWords(lang: string): PriceWords {
  const t = strings(lang)
  return { levels: t.priceLevels, money: t.money, from: t.priceFrom, upTo: t.priceUpTo }
}

/**
 * "💵 Moderate · 3,000–8,000 Ks per person".
 *
 * "per person" attaches to the amounts, not to the level: "Moderate per
 * person" is not something anybody says.
 */
export function formatPrice(place: Place, lang: string): string | null {
  const parts = priceParts(place.price, priceWords(lang))
  if (!parts) return null

  const t = strings(lang)
  const range = parts.range ? `${parts.range} ${t.perPerson}` : null
  return `💵 ${[parts.level, range].filter(Boolean).join(' · ')}`
}

/**
 * The place's amenities as words: "📶 Wi-Fi · 🌤 Outdoor seating".
 *
 * A place stores slugs, so anything the catalog does not know is dropped
 * rather than printed raw - a reader has no use for "outdoor_seating", and a
 * slug that resolves to nothing is an editing mistake, not news.
 */
export function formatAmenities(
  place: Place,
  catalog: readonly Amenity[],
  lang: string,
): string | null {
  const found = resolveAmenities(place.amenities, catalog)
  if (found.length === 0) return null

  const t = strings(lang)
  const chips = found
    .map((amenity) =>
      amenity.icon ? `${amenity.icon} ${escapeHtml(amenity.name)}` : escapeHtml(amenity.name),
    )
    .join(' · ')

  return `<b>${escapeHtml(t.amenities)}</b>\n${chips}`
}

/** Everything the screen can say, with the description at a given length. */
function build(
  place: Place,
  lang: string,
  catalog: readonly Amenity[],
  descriptionMax: number,
): string {
  const t = strings(lang)
  const lines: string[] = []

  lines.push(`<b>${escapeHtml(place.name)}</b>`)

  const rating = formatRating(place, lang)
  const category = place.category.icon
    ? `${place.category.icon} ${escapeHtml(place.category.name)}`
    : escapeHtml(place.category.name)
  lines.push(rating ? `${category}  ${rating}` : category)

  // Directly under the category, where the website also puts it: what a visit
  // costs is part of deciding whether to read the rest.
  const price = formatPrice(place, lang)
  if (price) lines.push(price)

  if (place.description && descriptionMax > 0) {
    lines.push('', escapeHtml(truncate(place.description, descriptionMax)))
  }

  const facts: string[] = []
  if (place.address) facts.push(`📍 ${escapeHtml(place.address)}`)
  if (place.phone) facts.push(`📞 ${escapeHtml(place.phone)}`)
  if (facts.length > 0) lines.push('', ...facts)

  const hours = formatHours(place.opening_hours, lang)
  if (hours) {
    lines.push('', `<b>${escapeHtml(t.hours)}</b>`, `<code>${escapeHtml(hours)}</code>`)
  }

  const amenities = formatAmenities(place, catalog, lang)
  if (amenities) lines.push('', amenities)

  return lines.join('\n')
}

/**
 * The detail screen's body. Used as a photo caption when the place has an
 * image and as message text when it does not, so it is built against the
 * tighter of the two limits.
 *
 * A caption has 1024 characters to hold all of this, and a place with a long
 * description, seven days of hours and a row of amenities genuinely does not
 * fit. Cutting the end off would lose the hours and the amenities - the two
 * things somebody opened the screen for - so the description gives up its
 * space first, in steps, because it is the one part that still reads correctly
 * at half the length.
 *
 * The first step is the description entire. A message has 4096 characters and
 * almost always has room for it; only the caption has to start cutting, and
 * only then as far as it must.
 */
const DESCRIPTION_STEPS = [Infinity, 600, 400, 240, 120, 0]

export function formatPlace(
  place: Place,
  lang: string,
  limit = CAPTION_LIMIT,
  catalog: readonly Amenity[] = [],
): string {
  for (const descriptionMax of DESCRIPTION_STEPS) {
    const text = build(place, lang, catalog, descriptionMax)
    if (text.length <= limit) return text
  }

  // No description left and still too long: a place with an enormous name or
  // address. Cutting is all that remains.
  return truncate(build(place, lang, catalog, 0), limit)
}
