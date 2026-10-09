import type { Price } from './domain'

/**
 * How a price reads, decided once.
 *
 * The same reasoning as `groupHours`: the website, the Telegram bot and the
 * native app all have to turn one `Price` into the same words, and three
 * copies of "which of min and max is set, and where does the unit go" is three
 * chances to disagree about what a place costs.
 *
 * Only the *shape* lives here. The words themselves stay in each client's own
 * dictionary, because each already has one and a translation belongs next to
 * the rest of its language, not in a package.
 */

/** The wording a caller supplies, from its own dictionary. */
export interface PriceWords {
  /** Three labels, cheapest first, for levels 1, 2 and 3. */
  levels: readonly string[]
  /** An amount with its unit: `3000` -> "3,000 Ks". */
  money: (amount: number) => string
  /** A lower bound only: "From 1,500 Ks". */
  from: (amount: string) => string
  /** An upper bound only: "Up to 5,000 Ks". */
  upTo: (amount: string) => string
}

/** Digits stay ASCII in every language, as they do everywhere else. */
const amount = (value: number) => value.toLocaleString('en-US')

/**
 * The exact range, or null when the place has not given one.
 *
 * "3,000-8,000 Ks" says the unit once, at the end, because saying it twice
 * reads as two separate prices rather than one range. A min equal to the max
 * is not a range at all and is written as the single amount it is.
 */
export function formatPriceRange(price: Price, words: PriceWords): string | null {
  const { min, max } = price

  if (min !== null && max !== null) {
    return min === max ? words.money(min) : `${amount(min)}–${words.money(max)}`
  }
  if (min !== null) return words.from(words.money(min))
  if (max !== null) return words.upTo(words.money(max))
  return null
}

/**
 * The level as a word: "Moderate", not "$$".
 *
 * A row of currency symbols means nothing without knowing the scale, and a
 * screen reader reads it as repeated noise.
 */
export function priceLevelLabel(price: Price, words: PriceWords): string | null {
  return price.level === null ? null : (words.levels[price.level - 1] ?? null)
}

/**
 * Both halves at once, for a client that renders them together.
 *
 * `null` in, `null` out: a place that charges nothing to enter has no price,
 * and so does a response from an API that predates the column - which is why
 * this takes `undefined` as well, rather than crashing a screen that was
 * written after the migration and is reading data from before it.
 */
export function priceParts(
  price: Price | null | undefined,
  words: PriceWords,
): { level: string | null; range: string | null } | null {
  if (!price) return null

  const level = priceLevelLabel(price, words)
  const range = formatPriceRange(price, words)

  // A price row with nothing in it is not a price row.
  return level === null && range === null ? null : { level, range }
}

/**
 * One line of plain text: "Moderate · 3,000-8,000 Ks".
 *
 * For the places that cannot lay out two pieces independently - a Telegram
 * message, a notification - where the separator has to be a character rather
 * than a gap.
 */
export function formatPriceLine(
  price: Price | null | undefined,
  words: PriceWords,
  separator = ' · ',
): string | null {
  const parts = priceParts(price, words)
  if (!parts) return null
  return [parts.level, parts.range].filter(Boolean).join(separator)
}
