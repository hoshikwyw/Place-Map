import Link from 'next/link'
import type { Category } from '@place-map/shared'
import { t, type Locale } from '@/lib/i18n'

/**
 * The categories as one sliding row of chips, as on the brand sheet.
 *
 * It scrolls sideways rather than wrapping, so the row costs one line whatever
 * the number of categories - adding a dozen more pushes nothing down the page.
 * No JavaScript: a `overflow-x-auto` strip scrolls with a trackpad, a finger,
 * a shift-wheel, or by tabbing through the links, which pulls each into view.
 *
 * Myanmar is written without spaces between words, so a chip's label must never
 * wrap mid-word: `whitespace-nowrap` is load-bearing here, not cosmetic.
 */
export function CategoryChips({
  categories,
  locale,
  /** The category being viewed, so its chip reads as the current one. */
  current,
  /** Where the leading "All places" chip points. */
  allHref,
}: {
  categories: Category[]
  locale: Locale
  current?: string
  allHref: string
}) {
  const text = t(locale)
  const base =
    'flex shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-bold transition'
  const idle =
    'border-[var(--color-line)] bg-[var(--color-surface)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]'
  const active = 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-on-accent)]'

  return (
    <nav aria-label={text.categories}>
      {/* The negative margin lets the row bleed to the screen edges on a phone,
          so the last chip is not clipped by the page gutter - the padding puts
          the gutter back inside the scrolling strip. */}
      <ul className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 py-1">
        <li>
          <Link href={allHref} aria-current={current ? undefined : 'page'} className={`${base} ${current ? idle : active}`}>
            {text.allPlaces}
          </Link>
        </li>

        {categories.map((category) => {
          const isCurrent = category.slug === current
          return (
            <li key={category.id}>
              <Link
                href={`/${locale}/c/${category.slug}`}
                aria-current={isCurrent ? 'page' : undefined}
                className={`${base} ${isCurrent ? active : idle}`}
              >
                <span aria-hidden>{category.icon ?? '📍'}</span>
                {category.name}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
