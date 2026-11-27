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
      <h2 className="section-title">{text.reviews.title}</h2>

      {total > 0 && (
        <div className="surface mb-6 flex flex-wrap items-center gap-x-8 gap-y-4 p-5 sm:p-6">
          {/* The score large, the way every review site leads: it is the one
              number someone scanning the section wants. */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="font-display text-5xl leading-none tabular-nums">{average.toFixed(1)}</div>
            <Stars
              rating={Math.round(average)}
              label={text.reviews.averageOf(average.toFixed(1), total)}
            />
          </div>

          {/* Five rows, most stars first, the way every other site draws it. */}
          <ul className="min-w-[10rem] flex-1 space-y-1.5">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = counts[stars - 1] ?? 0
              const share = total > 0 ? (count / total) * 100 : 0
              return (
                <li key={stars} className="flex items-center gap-2.5 text-xs tabular-nums">
                  <span className="w-3 text-right font-semibold text-[var(--color-muted)]">{stars}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-line)]">
                    <span
                      className="block h-full rounded-full bg-[var(--color-star)]"
                      style={{ width: `${share}%` }}
                    />
                  </span>
                  <span className="w-5 text-right text-[var(--color-muted)]">{count}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {total === 0 ? (
        <p className="mb-5 text-sm text-[var(--color-muted)]">{text.reviews.none}</p>
      ) : (
        <ul className="mb-8 divide-y divide-[var(--color-line)]">
          {reviews.map((review) => {
            const name = review.author || text.reviews.anonymous
            return (
              <li key={review.id} className="flex gap-3.5 py-5 first:pt-0">
                {/* The first letter of the name in a soft circle: a face for
                    each review without asking anyone for a photo. */}
                <span
                  aria-hidden
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-sm font-bold uppercase text-[var(--color-accent)]"
                >
                  {Array.from(name)[0]}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-bold">{name}</p>
                      <p className="text-xs text-[var(--color-muted)]">{when(review.created_at, locale)}</p>
                    </div>
                    <Stars rating={review.rating} label={text.reviews.starsLabel(review.rating)} />
                  </div>
                  {review.comment && (
                    <p className="mt-2 whitespace-pre-line break-words text-[15px] leading-relaxed">
                      {review.comment}
                    </p>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <ReviewForm placeId={placeId} locale={locale} />
    </section>
  )
}
