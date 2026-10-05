import Link from 'next/link'
import type { PlaceSummary } from '@place-map/shared'
import type { Locale } from '@/lib/i18n'
import { CategoryIcon } from './category-icon'
import { OpenNow } from './open-now'

/**
 * A place, as a card.
 *
 * Sized for reading rather than for density: the name is 18px, the address 15,
 * and the open/closed chip is a chip rather than coloured small print. A
 * directory is read by people of every age, often on a phone held at arm's
 * length, and nothing here is worth saving 2px over.
 *
 * The whole card is one link - a card with a small "view" link inside it gives
 * the same action a much smaller target for no benefit.
 */
export function PlaceCard({
  place,
  locale,
  timeZone,
  showCategory = false,
}: {
  place: PlaceSummary
  locale: Locale
  timeZone: string
  showCategory?: boolean
}) {
  return (
    <li>
      <Link
        href={`/${locale}/p/${place.slug}`}
        className="group flex h-full flex-col overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] transition duration-200 hover:-translate-y-1 hover:border-[var(--color-accent)] hover:shadow-lg hover:shadow-[var(--color-accent-soft)]"
      >
        <div className="aspect-[3/2] overflow-hidden bg-[var(--color-tint-soft)]">
          {place.image ? (
            // Served straight from ImageKit: already 1200px WebP under 200 KB.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={place.image.url}
              alt=""
              width={place.image.width ?? undefined}
              height={place.image.height ?? undefined}
              loading="lazy"
              decoding="async"
              className="size-full object-cover transition duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <CategoryIcon category={place.category} size={72} />
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2 p-5">
          {showCategory && (
            <p className="flex items-center gap-1.5 text-sm font-bold text-[var(--color-accent)]">
              <CategoryIcon category={place.category} size={16} />
              {place.category.name}
            </p>
          )}

          {/* Two lines, then an ellipsis: a long name must not push the chip
              below the fold of the card and make the row ragged. */}
          <h3 className="line-clamp-2 text-lg font-bold leading-snug transition group-hover:text-[var(--color-accent)]">
            {place.name}
          </h3>

          {place.address && (
            <p className="line-clamp-2 text-[15px] leading-normal text-[var(--color-muted)]">{place.address}</p>
          )}

          {/* Pushed to the bottom, so the chips line up across a row of cards
              whatever the length of the names above them. */}
          <div className="mt-auto pt-1">
            <OpenNow hours={place.opening_hours} timeZone={timeZone} locale={locale} />
          </div>
        </div>
      </Link>
    </li>
  )
}
