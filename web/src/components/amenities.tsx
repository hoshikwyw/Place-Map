import { resolveAmenities, type Amenity } from '@place-map/shared'

/**
 * The things people check before going somewhere, as a row of chips.
 *
 * A place stores slugs; the catalog passed in here supplies the names, in the
 * reader's language, and the order. The name is always shown - an icon alone
 * is a guessing game, since a square with a car in it is not obviously
 * "parking" to everyone.
 *
 * Three sources for the mark beside the name, in this order: an icon uploaded
 * in the dashboard, which is a deliberate choice and so beats everything; one
 * of the icons drawn below, which exist for the nine the directory shipped
 * with; then the emoji. A chip with none of the three is still a chip.
 */

const ICONS: Record<string, React.ReactNode> = {
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
  catalog,
  label,
}: {
  /** Slugs the place carries. An API predating the column sends nothing. */
  amenities?: string[] | null
  catalog: Amenity[]
  label: string
}) {
  const shown = resolveAmenities(amenities, catalog)
  if (shown.length === 0) return null

  return (
    <section>
      <h2 className="mb-3 text-sm font-bold text-[var(--color-muted)]">{label}</h2>
      <ul className="flex flex-wrap gap-2">
        {shown.map((amenity) => {
          const drawn = ICONS[amenity.slug]
          return (
            <li
              key={amenity.slug}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-2 text-sm"
            >
              {amenity.icon_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={amenity.icon_image}
                  alt=""
                  width={16}
                  height={16}
                  loading="lazy"
                  className="size-4 shrink-0 object-contain"
                />
              ) : drawn ? (
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
                  {drawn}
                </svg>
              ) : (
                amenity.icon && (
                  <span aria-hidden className="text-base leading-none">
                    {amenity.icon}
                  </span>
                )
              )}
              <span className="whitespace-nowrap">{amenity.name}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
