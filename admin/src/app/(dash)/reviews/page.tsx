import Link from 'next/link'
import { publish, remove } from '@/actions/reviews'
import { listAllPlaces, listReviews } from '@/lib/api'
import { LOCALES } from '@/lib/form'
import { Badge, Card, Empty, PageHeader } from '@/components/ui'
import { DeleteButton } from '@/components/form-parts'
import { ActionButton } from '../suggestions/action-button'

export const dynamic = 'force-dynamic'

const TABS = ['waiting', 'published', 'all'] as const
type Tab = (typeof TABS)[number]

const TAB_LABEL: Record<Tab, string> = {
  waiting: 'Waiting',
  published: 'Published',
  all: 'Everything',
}

const WHEN = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function isTab(value: string | undefined): value is Tab {
  return TABS.includes((value ?? '') as Tab)
}

/** Filled stars then hollow ones - readable at a glance down a column. */
function Stars({ rating }: { rating: number }) {
  return (
    <span
      className="text-[var(--color-star)]"
      aria-label={`${rating} out of 5`}
      title={`${rating} out of 5`}
    >
      {'★'.repeat(rating)}
      <span className="text-[var(--color-line)]">{'★'.repeat(5 - rating)}</span>
    </span>
  )
}

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab: raw } = await searchParams
  const tab: Tab = isTab(raw) ? raw : 'waiting'

  const [reviews, places] = await Promise.all([
    listReviews(tab === 'all' ? undefined : tab === 'published'),
    listAllPlaces(),
  ])

  const primary = LOCALES[0] ?? 'en'
  const place = new Map(
    places.map((row) => [row.id, row.name[primary] ?? Object.values(row.name)[0] ?? row.slug]),
  )

  return (
    <>
      <PageHeader title="Reviews" />

      <p className="mb-4 text-sm text-[var(--color-muted)]">
        Nothing here is visible to anyone until you publish it. Publishing also moves the
        place&rsquo;s rating &mdash; it is recomputed from its published reviews, so a place whose
        only published review is three stars shows 3.0, whatever was there before.
      </p>

      <nav className="mb-4 flex flex-wrap gap-2">
        {TABS.map((value) => (
          <Link
            key={value}
            href={value === 'waiting' ? '/reviews' : `/reviews?tab=${value}`}
            aria-current={value === tab ? 'page' : undefined}
            className={
              value === tab
                ? 'rounded-full bg-[var(--color-accent-soft)] px-4 py-1.5 text-sm font-bold text-[var(--color-accent)]'
                : 'rounded-full border border-[var(--color-line)] px-4 py-1.5 text-sm font-semibold text-[var(--color-muted)] transition hover:text-[var(--color-ink)]'
            }
          >
            {TAB_LABEL[value]}
          </Link>
        ))}
      </nav>

      {reviews.length === 0 ? (
        <Card>
          <Empty>
            {tab === 'waiting'
              ? 'Nothing waiting. Reviews left on the site arrive here first.'
              : `Nothing ${TAB_LABEL[tab].toLowerCase()}.`}
          </Empty>
        </Card>
      ) : (
        <ul className="space-y-3">
          {reviews.map((review) => (
            <li key={review.id}>
              <Card>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Stars rating={review.rating} />
                  {review.is_published ? (
                    <Badge>published</Badge>
                  ) : (
                    <Badge tone="warn">not visible</Badge>
                  )}
                  <span className="ml-auto text-xs text-[var(--color-muted)]">
                    {WHEN.format(new Date(review.created_at))}
                  </span>
                </div>

                <p className="text-sm text-[var(--color-muted)]">
                  About{' '}
                  <Link
                    href={`/places/${review.place_id}`}
                    className="font-bold text-[var(--color-accent)] hover:underline"
                  >
                    {place.get(review.place_id) ?? `place ${review.place_id}`}
                  </Link>
                </p>

                {review.comment && (
                  // Whitespace kept: people write in paragraphs.
                  <p className="mt-2 whitespace-pre-wrap text-sm">{review.comment}</p>
                )}

                <p className="mt-2 text-xs text-[var(--color-muted)]">
                  {review.author ? (
                    <>
                      Signed <span className="font-semibold text-[var(--color-ink)]">{review.author}</span>{' '}
                      &mdash; a name they typed, not an identity
                    </>
                  ) : (
                    'Left anonymously'
                  )}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <form action={publish.bind(null, review.id, !review.is_published)}>
                    <ActionButton label={review.is_published ? 'Hide' : 'Publish'} />
                  </form>

                  <form action={remove.bind(null, review.id)} className="ml-auto">
                    <DeleteButton confirm="Delete this review? Hiding it keeps the record instead." />
                  </form>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
