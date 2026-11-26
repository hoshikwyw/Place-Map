import Link from 'next/link'
import type { PlaceSummary } from '@place-map/shared'
import { t, type Locale } from '@/lib/i18n'
import { CategoryIcon } from './category-icon'
import { OpenNow } from './open-now'
import { PriceTag } from './price'
import { Rating } from './rating'
import { SaveButton } from './save-button'

/**
 * A place, as a card: the photo, then three short lines under it.
 *
 * Frameless - no box around the whole card. The photo is the card's shape,
 * and the text sits on the page beneath it. A boxed card puts a border round
 * every place in the grid, and at twelve to a page those borders were most of
 * what the eye met; without them the photos carry the page.
 *
 *  1. The name, with the rating at the end of the same line - the two things
 *     a scan compares.
 *  2. The address, muted.
 *  3. Open or closed as a coloured dot and a word, the price level, and the
 *     distance while sorted by it. Quiet on purpose: a filled pill per card
 *     made a dozen pills the loudest thing on the screen.
 *
 * Still sized for reading rather than density - a directory is read by
 * people of every age, often on a phone held at arm's length.
 *
 * The whole card is one link: a card with a small "view" link inside gives
 * the same action a much smaller target for no benefit.
 */
export function PlaceCard({
  place,
  locale,
  timeZone,
  showCategory = false,
  distanceM = null,
  headingLevel = 3,
}: {
  place: PlaceSummary
  locale: Locale
  timeZone: string
  showCategory?: boolean
  /** Set only while the list is sorted by distance, where it explains the order. */
  distanceM?: number | null
  /**
   * Which heading the name is. The caller knows what sits above it: the home
   * page has an "All places" h2, so its cards are h3; a category page's grid
   * is the only thing under the h1, so there its cards are h2. Skipping a
   * level reads as a missing section to anyone navigating by heading.
   */
  headingLevel?: 2 | 3
}) {
  const Name = headingLevel === 2 ? 'h2' : 'h3'

  return (
    // min-w-0: this li is the grid item, and a grid item defaults to
    // min-width:auto - it will not shrink below its content's min-content
    // width. A long unbroken name or a pasted URL therefore widened the whole
    // column and pushed the page sideways, with break-words on the text
    // having no effect at all, because nothing was ever forced to break.
    <li className="relative min-w-0">
      <Link href={`/${locale}/p/${place.slug}`} className="group block rounded-[var(--brand-radius-lg)]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--brand-radius-lg)] bg-[var(--color-tint-soft)] shadow-[0_1px_2px_rgb(12_12_20/0.06)]">
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
              className="size-full object-cover transition duration-500 ease-out group-hover:scale-[1.04]"
            />
          ) : (
            // No photo: the category's own icon, large and centred, rather
            // than an empty grey rectangle.
            <div className="flex size-full items-center justify-center text-[var(--color-accent)]">
              <CategoryIcon category={place.category} size={56} className="opacity-80" />
            </div>
          )}

          {/* A darkening at the top edge, under the overlays, so the category
              chip and the heart stay legible on a bright photo. */}
          {place.image && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-linear-to-b from-black/25 to-transparent"
            />
          )}

          {showCategory && (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface)]/90 px-2.5 py-1 text-xs font-semibold text-[var(--color-ink)] shadow-sm backdrop-blur-md">
              <CategoryIcon category={place.category} size={14} />
              {place.category.name}
            </span>
          )}
        </div>

        <div className="min-w-0 px-0.5 pt-3">
          <div className="flex items-start justify-between gap-3">
            <Name className="line-clamp-2 min-w-0 break-words text-base font-semibold leading-snug underline-offset-4 group-hover:underline sm:text-[17px]">
              {place.name}
            </Name>
            {place.rating !== null && (
              <span className="mt-px shrink-0">
                <Rating rating={place.rating} count={place.rating_count} locale={locale} />
              </span>
            )}
          </div>

          {place.address && (
            <p className="mt-0.5 line-clamp-1 break-words text-sm leading-normal text-[var(--color-muted)]">
              {place.address}
            </p>
          )}

          {/* Spacing, not separator dots: OpenNow renders nothing until it has
              mounted, and the row wraps on a phone, either of which would
              strand a dot at the start of a line. */}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <OpenNow hours={place.opening_hours} timeZone={timeZone} locale={locale} variant="inline" />
            {/* The level alone, not the range: on a card the useful thing is
                what compares across places. The amounts are on the place page. */}
            <PriceTag price={place.price} locale={locale} className="text-sm font-semibold" />
            {distanceM !== null && (
              <span className="text-sm font-semibold text-[var(--color-muted)]">
                {t(locale).distance(Math.round(distanceM))}
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* A sibling of the link, not a child: a button inside an anchor is
          invalid, and it would make the card announce itself as "Cafe
          Central, save this place". The wrapper borrows the photo's aspect
          ratio so the heart lands in the photo's top-right corner, where a
          save heart is expected, whatever the card's width. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 aspect-[4/3]">
        <span className="pointer-events-auto absolute right-2 top-2">
          <SaveButton id={place.id} locale={locale} />
        </span>
      </div>
    </li>
  )
}
