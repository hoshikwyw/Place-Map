import {
  priceParts,
  type Price as PriceValue,
  type PriceWords,
} from '@place-map/shared'
import { t, type Locale } from '@/lib/i18n'

/**
 * What a visit costs: a word for how expensive the place is, and an exact
 * range when it has one. Either half may be missing - most places will only
 * ever say the first - so both render independently.
 *
 * The wording decisions live in @place-map/shared, so the bot and the app say
 * exactly the same thing about the same place. This file supplies the words
 * from the site's dictionary and lays the two parts out.
 */

/** The site's dictionary, in the shape the shared formatter asks for. */
export function priceWords(locale: Locale): PriceWords {
  const text = t(locale)
  return {
    levels: text.priceLevels,
    money: text.money,
    from: text.priceFrom,
    upTo: text.priceUpTo,
  }
}

export function Price({
  price,
  locale,
  className = '',
}: {
  price: PriceValue | null | undefined
  locale: Locale
  className?: string
}) {
  const text = t(locale)
  // Null for a place that charges nothing to enter, undefined from an API that
  // predates the column, and null again for a row that says nothing.
  const parts = priceParts(price, priceWords(locale))
  if (!parts) return null

  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-2 ${className}`}>
      {parts.level && <span className="font-bold">{parts.level}</span>}
      {parts.range && (
        <span className="text-[var(--color-muted)]">
          {parts.range}
          <span className="ml-1 text-xs">{text.perPerson}</span>
        </span>
      )}
    </span>
  )
}

/**
 * The compact form for a card: the level alone, or the range when that is all
 * a place gave. A card has one line to spare and the level is the part that
 * compares across places, which is what somebody scanning a list is doing.
 */
export function PriceTag({
  price,
  locale,
  className = '',
}: {
  price: PriceValue | null | undefined
  locale: Locale
  className?: string
}) {
  const parts = priceParts(price, priceWords(locale))
  if (!parts) return null

  return (
    <span className={`font-bold text-[var(--color-muted)] ${className}`}>
      {parts.level ?? parts.range}
    </span>
  )
}
