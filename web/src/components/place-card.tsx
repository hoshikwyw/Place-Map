import Link from 'next/link'
import type { PlaceSummary } from '@place-map/shared'
import type { Locale } from '@/lib/i18n'
import { OpenNow } from './open-now'

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
        className="group block h-full overflow-hidden rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] transition hover:-translate-y-0.5 hover:border-[var(--color-accent)]"
      >
        <div className="aspect-[3/2] bg-[var(--color-coral-soft)]">
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
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-4xl">
              {place.category.icon ?? '📍'}
            </div>
          )}
        </div>

        <div className="space-y-1.5 p-4">
          <h3 className="font-bold leading-snug transition group-hover:text-[var(--color-accent)]">
            {place.name}
          </h3>
          {showCategory && (
            <p className="text-xs font-semibold text-[var(--color-muted)]">
              {place.category.icon} {place.category.name}
            </p>
          )}
          {place.address && <p className="truncate text-sm text-[var(--color-muted)]">{place.address}</p>}
          <OpenNow hours={place.opening_hours} timeZone={timeZone} locale={locale} />
        </div>
      </Link>
    </li>
  )
}
