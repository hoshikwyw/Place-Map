import Link from 'next/link'
import { t, type Locale } from '@/lib/i18n'

/**
 * Pages of a list: round arrows at the ends, numbered pages between.
 *
 * Numbers rather than only "previous / next": with numbers, someone on page 2
 * of 9 can see how much is left and jump to the end, and "page 5" is a place
 * they can come back to. Seven slots at most - the first, the last, the
 * current page and its neighbours, with an ellipsis for each gap - so the row
 * stays the same short length whatever the count.
 *
 * On a phone the numbers give way to "Page 5 of 12" between two round arrows,
 * whose words become their accessible names.
 */
export function Pagination({
  locale,
  page,
  totalPages,
  hrefFor,
}: {
  locale: Locale
  page: number
  totalPages: number
  hrefFor: (page: number) => string
}) {
  if (totalPages <= 1) return null
  const text = t(locale)

  const arrow = (target: number, rel: 'prev' | 'next', enabled: boolean) => {
    const label = rel === 'prev' ? text.previous : text.next
    const icon = (
      <svg aria-hidden viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        <path d={rel === 'prev' ? 'm15 6-6 6 6 6' : 'm9 6 6 6-6 6'} />
      </svg>
    )
    const content = (
      <>
        {rel === 'prev' && icon}
        <span className="max-sm:sr-only">{label}</span>
        {rel === 'next' && icon}
      </>
    )
    // Round as an icon on a phone; with its word beside it from sm, a button
    // with words is a rounded rectangle like every other.
    const className = 'btn btn-secondary btn-icon sm:rounded-[var(--brand-radius-md)] sm:px-4'

    return enabled ? (
      <Link href={hrefFor(target)} rel={rel} className={className}>
        {content}
      </Link>
    ) : (
      // Not a link: there is nowhere to go. aria-disabled gives it the
      // disabled look (see .btn) without pretending to be a control.
      <span aria-disabled="true" className={className}>
        {content}
      </span>
    )
  }

  return (
    <nav aria-label="Pagination" className="mt-12 flex items-center justify-between gap-2">
      {arrow(page - 1, 'prev', page > 1)}

      {/* The numbers from sm up: seven 44px targets and two arrows need
          about 410px, more than a 320px phone has. There the page is said
          in words between the arrows instead. */}
      <p className="text-sm font-semibold tabular-nums text-[var(--color-muted)] sm:hidden">{text.pageOf(page, totalPages)}</p>

      <ol className="hidden items-center gap-1 sm:flex">
        {pageSlots(page, totalPages).map((slot, index) =>
          slot === null ? (
            <li key={`gap-${index}`} aria-hidden className="w-6 text-center text-sm text-[var(--color-muted)]">
              …
            </li>
          ) : (
            <li key={slot}>
              <Link
                href={hrefFor(slot)}
                aria-current={slot === page ? 'page' : undefined}
                aria-label={text.pageOf(slot, totalPages)}
                className={`flex size-11 items-center justify-center rounded-full text-sm font-semibold tabular-nums transition ${
                  slot === page
                    ? 'bg-[var(--color-accent)] text-[var(--color-on-accent)]'
                    : 'text-[var(--color-muted)] hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)]'
                }`}
              >
                {slot}
              </Link>
            </li>
          ),
        )}
      </ol>

      {arrow(page + 1, 'next', page < totalPages)}
    </nav>
  )
}

/**
 * The page numbers to show, with null for a gap: always the first and the
 * last, the current page and one either side, and every page when there are
 * few enough to fit. A gap of exactly one page shows that page instead - an
 * ellipsis standing in for a single number saves no room.
 */
export function pageSlots(page: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const shown = new Set([1, total, page - 1, page, page + 1].filter((n) => n >= 1 && n <= total))
  const sorted = [...shown].sort((a, b) => a - b)
  const slots: (number | null)[] = []
  for (const n of sorted) {
    const previous = slots.at(-1)
    if (typeof previous === 'number' && n - previous === 2) slots.push(previous + 1)
    else if (typeof previous === 'number' && n - previous > 2) slots.push(null)
    slots.push(n)
  }
  return slots
}
