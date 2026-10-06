import type { Price as PriceValue } from '@place-map/shared'
import { t, type Locale } from '@/lib/i18n'

/**
 * What a visit costs: a word for how expensive the place is, and an exact
 * range when it has one. Either half may be missing - most places will only
 * ever say the first - so both render independently.
 *
 * The level is a word rather than a row of currency symbols. "₭₭" tells you
 * nothing unless you already know the scale, and a screen reader reads it as
 * repeated noise.
 */

/** Digits are ASCII in both locales, as everywhere else on the site. */
const amount = (value: number) => value.toLocaleString('en-US')

/** "3,000–8,000 Ks", "From 1,500 Ks", "5,000 Ks". Null when no amount is known. */
export function formatPriceRange(price: PriceValue, locale: Locale): string | null {
  const text = t(locale)
  const { min, max } = price

  if (min !== null && max !== null) {
    // The unit is said once, at the end of the range.
    return min === max ? text.money(min) : `${amount(min)}–${text.money(max)}`
  }
  if (min !== null) return text.priceFrom(text.money(min))
  if (max !== null) return text.priceUpTo(text.money(max))
  return null
}

export function priceLevelLabel(price: PriceValue, locale: Locale): string | null {
  return price.level === null ? null : (t(locale).priceLevels[price.level - 1] ?? null)
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
  // Null for a place that charges nothing to enter, undefined from an API that
  // predates the column - neither has anything to show.
  if (!price) return null

  const text = t(locale)
  const level = priceLevelLabel(price, locale)
  const range = formatPriceRange(price, locale)
  if (!level && !range) return null

  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-2 ${className}`}>
      {level && <span className="font-bold">{level}</span>}
      {range && (
        <span className="text-[var(--color-muted)]">
          {range}
          <span className="ml-1 text-xs">{text.perPerson}</span>
        </span>
      )}
    </span>
  )
}
