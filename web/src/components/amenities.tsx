import { AMENITIES, type Amenity } from '@place-map/shared'
import { t, type Locale } from '@/lib/i18n'

/**
 * The things people check before going somewhere, as a row of chips.
 *
 * Each carries a small icon as well as its name. The icon alone would be a
 * guessing game - a square with a car in it is not obviously "parking" to
 * everyone - so the name is always there and the icon is decorative.
 */

const ICONS: Record<Amenity, React.ReactNode> = {
  wifi: (
    <>
      <path d="M5 12.55a11 11 0 0 1 14 0" />
      <path d="M8.5 16.03a6 6 0 0 1 7 0" />
      <path d="M12 20h.01" />
    </>
  ),
  parking: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M9 17V7h3.5a3 3 0 0 1 0 6H9" />
    </>
  ),
  outdoor_seating: (
    <>
      <path d="M12 3v18" />
      <path d="M5 8a7 7 0 0 1 14 0z" />
      <path d="M7 21h10" />
    </>
  ),
  air_conditioning: (
    <>
      <rect x="2" y="5" width="20" height="8" rx="2" />
      <path d="M7 17v2M12 17v3M17 17v2" />
    </>
  ),
  delivery: (
    <>
      <path d="M3 7h11v9H3z" />
      <path d="M14 10h4l3 3v3h-7z" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </>
  ),
  takeaway: (
    <>
      <path d="M5 8h14l-1.2 12H6.2z" />
      <path d="M9 8V5h6v3" />
    </>
  ),
  card_payment: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </>
  ),
  family_friendly: (
    <>
      <circle cx="9" cy="7" r="3" />
      <path d="M3 21v-2a5 5 0 0 1 5-5h2" />
      <circle cx="17" cy="11" r="2" />
      <path d="M13 21v-1a4 4 0 0 1 8 0v1" />
    </>
  ),
  wheelchair_accessible: (
    <>
      <circle cx="12" cy="4" r="2" />
      <path d="M11 8v6h5l3 6" />
      <path d="M14 14a5 5 0 1 1-5 5" />
    </>
  ),
}

export function Amenities({
  amenities,
  locale,
  label,
}: {
  // An API that predates the column sends nothing at all.
  amenities?: Amenity[] | null
  locale: Locale
  label: string
}) {
  if (!Array.isArray(amenities) || amenities.length === 0) return null

  const names = t(locale).amenityNames
  // The shared list defines the order, so two places never show the same set
  // differently. The API sorts too; this keeps it true if that ever changes.
  const shown = AMENITIES.filter((amenity) => amenities.includes(amenity))

  return (
    <section>
      <h2 className="mb-3 text-sm font-bold text-[var(--color-muted)]">{label}</h2>
      <ul className="flex flex-wrap gap-2">
        {shown.map((amenity) => (
          <li
            key={amenity}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-2 text-sm"
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              width={16}
              height={16}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 text-[var(--color-accent)]"
            >
              {ICONS[amenity]}
            </svg>
            <span className="whitespace-nowrap">{names[amenity]}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
