import { ratingBreakdown, type Review } from '@place-map/shared'
import { t, type Locale } from '@/lib/i18n'
import { ReviewForm } from './review-form'

/**
 * What people said, and a way to say something.
 *
 * Every review here has been approved by an editor - the API serves no others
 * - and the place's own rating is the average of exactly this set, so the
 * number at the top of the page and the stars down here can never disagree.
 *
 * The breakdown is drawn from the reviews already on the page, so it costs no
 * extra request. It is the thing that makes an average honest: 4.0 from five
 * fours reads very differently from 4.0 from two fives and a two.
 */

function Stars({ rating, label }: { rating: number; label?: string }) {
  return (
    <span className="whitespace-nowrap text-[var(--color-star)]" aria-label={label}>
      {'★'.repeat(rating)}
      <span className="text-[var(--color-line)]">{'★'.repeat(5 - rating)}</span>
    </span>
  )
}

/** Day and month; the year only when it is not this one. */
function when(value: string, locale: Locale): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const thisYear = date.getFullYear() === new Date().getFullYear()
  return new Intl.DateTimeFormat(locale === 'my' ? 'my-MM' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    ...(thisYear ? {} : { year: 'numeric' }),
  }).format(date)
}

export function Reviews({
  placeId,
  reviews,
  locale,
}: {
  placeId: number
  reviews: Review[]
  locale: Locale
}) {
  const text = t(locale)
  const counts = ratingBreakdown(reviews)
  const total = reviews.length
  const average = total > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / total : 0

  return (
    <section>
      <h2 className="mb-3 text-sm font-bold text-[var(--color-muted)]">{text.reviews.title}</h2>

      {total > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
          <div className="text-center">
            <div className="text-3xl font-bold leading-none">{average.toFixed(1)}</div>
            <Stars
              rating={Math.round(average)}
              label={text.reviews.averageOf(average.toFixed(1), total)}
            />
          </div>

          {/* Five rows, most stars first, the way every other site draws it. */}
          <ul className="min-w-[10rem] flex-1 space-y-1">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = counts[stars - 1] ?? 0
              const share = total > 0 ? (count / total) * 100 : 0
              return (
                <li key={stars} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-right text-[var(--color-muted)]">{stars}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-canvas)]">
                    <span
                      className="block h-full rounded-full bg-[var(--color-star)]"
                      style={{ width: `${share}%` }}
                    />
                  </span>
                  <span className="w-5 text-[var(--color-muted)]">{count}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {total === 0 ? (
        <p className="mb-5 text-sm text-[var(--color-muted)]">{text.reviews.none}</p>
      ) : (
        <ul className="mb-6 space-y-4">
          {reviews.map((review) => (
            <li key={review.id} className="border-b border-[var(--color-line)] pb-4 last:border-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <Stars rating={review.rating} label={text.reviews.starsLabel(review.rating)} />
                <span className="text-sm font-bold">
                  {review.author || text.reviews.anonymous}
                </span>
                <span className="ml-auto text-xs text-[var(--color-muted)]">
                  {when(review.created_at, locale)}
                </span>
              </div>
              {review.comment && (
                <p className="mt-1.5 whitespace-pre-line text-[15px] leading-relaxed">
                  {review.comment}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <ReviewForm placeId={placeId} locale={locale} />
    </section>
  )
}
