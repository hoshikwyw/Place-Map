import { t, type Locale } from '@/lib/i18n'

/**
 * A place's rating: one star, the number, and how many ratings it covers.
 *
 * One star rather than five: five partially-filled stars are harder to read at
 * a glance than "4.6", and at card size the difference between four and five
 * filled stars is a few pixels. The number is the information; the star only
 * says what kind of number it is.
 *
 * Renders nothing when a place has no rating - an empty row of grey stars
 * reads as "rated badly" rather than "not rated yet".
 */
export function Rating({
  rating,
  count,
  locale,
  size = 'sm',
}: {
  /** Undefined as well as null: a response cached before ratings existed, or an
   *  older deployed API, simply has no such field - and a missing rating must
   *  not take the page down with it. */
  rating: number | null | undefined
  count: number | null | undefined
  locale: Locale
  size?: 'sm' | 'lg'
}) {
  const score = Number(rating)
  if (rating == null || !Number.isFinite(score)) return null

  const text = t(locale)
  const value = score.toFixed(1)
  const total = Number.isFinite(Number(count)) ? Number(count) : 0

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold ${size === 'lg' ? 'text-base' : 'text-sm'}`}
      aria-label={text.ratingLabel(value, total)}
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`text-[var(--color-star)] ${size === 'lg' ? 'size-5' : 'size-4'}`}
      >
        <path d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.4-5.8-3-5.8 3 1.1-6.4L2.6 9.3l6.5-.9z" />
      </svg>
      <span>{value}</span>
      {total > 0 && (
        <span className="font-semibold text-[var(--color-muted)]">{text.ratingCount(total)}</span>
      )}
    </span>
  )
}
