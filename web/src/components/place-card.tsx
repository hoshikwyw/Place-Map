import Link from 'next/link'
import type { PlaceSummary } from '@place-map/shared'
import { t, type Locale } from '@/lib/i18n'
import { CategoryIcon } from './category-icon'
import { OpenNow } from './open-now'
import { PriceTag } from './price'
import { Rating } from './rating'
import { SaveButton } from './save-button'

/**
 * A place, as a card.
 *
 * The picture carries the labels that describe the picture - the category on
 * one corner, the rating on the other - which leaves the text below it as just
 * the name and the address. That is one line of text less than the previous
 * version, and the cards in a row end up the same height whatever each place
 * happens to have.
 *
 * Still sized for reading rather than density: an 18px name and a 15px address,
 * because a directory is read by people of every age, often on a phone held at
 * arm's length.
 *
 * The whole card is one link - a card with a small "view" link inside gives the
 * same action a much smaller target for no benefit.
 */
export function PlaceCard({
  place,
  locale,
  timeZone,
  showCategory = false,
  distanceM = null,
}: {
  place: PlaceSummary
  locale: Locale
  timeZone: string
  showCategory?: boolean
  /** Set only while the list is sorted by distance, where it explains the order. */
  distanceM?: number | null
}) {
  /** Over a photo, a solid-ish chip is the only thing that stays legible. */
  const overlay =
    'inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface)]/90 px-2.5 py-1 text-xs font-bold text-[var(--color-ink)] shadow-sm backdrop-blur-sm'

  return (
    <li className="relative">
      <Link
        href={`/${locale}/p/${place.slug}`}
        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] transition duration-200 hover:-translate-y-1 hover:border-[var(--color-accent)] hover:shadow-xl hover:shadow-[var(--color-accent-soft)]"
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-[var(--color-tint-soft)]">
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
              className="size-full object-cover transition duration-300 group-hover:scale-[1.04]"
            />
          ) : (
            // No photo: the category's own icon, large and centred, rather than
            // an empty grey rectangle.
            <div className="flex size-full items-center justify-center">
              <CategoryIcon category={place.category} size={64} className="opacity-90" />
            </div>
          )}

          {showCategory && (
            <span className={`absolute left-3 top-3 ${overlay}`}>
              <CategoryIcon category={place.category} size={14} />
              {place.category.name}
            </span>
          )}

          {place.rating !== null && (
            <span className={`absolute right-3 top-3 ${overlay}`}>
              <Rating rating={place.rating} count={place.rating_count} locale={locale} />
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1.5 p-4">
          <h3 className="line-clamp-2 text-lg font-bold leading-snug transition group-hover:text-[var(--color-accent)]">
            {place.name}
          </h3>

          {place.address && (
            <p className="line-clamp-1 text-[15px] leading-normal text-[var(--color-muted)]">{place.address}</p>
          )}

          {/* Pushed to the bottom, so the chips line up across a row of cards
              whatever the length of the names above them. */}
          <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2">
            <OpenNow hours={place.opening_hours} timeZone={timeZone} locale={locale} />
            {/* The level alone, not the range: on a card the useful thing is
                what compares across places, which is what somebody scanning a
                list is doing. The exact amounts are on the place page. */}
            <PriceTag price={place.price} locale={locale} className="text-sm" />
            {distanceM !== null && (
              // Only while the list is sorted by distance, where it explains
              // why this card is where it is.
              <span className="text-sm font-semibold text-[var(--color-muted)]">
                {t(locale).distance(Math.round(distanceM))}
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* A sibling of the link, not a child: a button inside an anchor is
          invalid, and it would make the card announce itself as "Cafe Central,
          save this place". The wrapper borrows the photo's aspect ratio so the
          heart lands in the photo's bottom corner whatever the card's width. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 aspect-[16/10]">
        <span className="pointer-events-auto absolute bottom-3 right-3">
          <SaveButton id={place.id} locale={locale} />
        </span>
      </div>
    </li>
  )
}
