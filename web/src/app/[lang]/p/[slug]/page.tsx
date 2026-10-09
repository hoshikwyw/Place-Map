import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { WEEKDAYS, type Place } from '@place-map/shared'
import { Amenities } from '@/components/amenities'
import { CategoryIcon } from '@/components/category-icon'
import { Gallery } from '@/components/gallery'
import { HoursTable } from '@/components/hours-table'
import { OpenNow } from '@/components/open-now'
import { PlaceLinks } from '@/components/place-links'
import { Price } from '@/components/price'
import { Rating } from '@/components/rating'
import { SaveButton } from '@/components/save-button'
import { PlaceMap } from '@/components/place-map'
import { NotFoundError, getAmenities, getPlace } from '@/lib/api'
import { config } from '@/lib/config'
import { isLocale, t, type Locale } from '@/lib/i18n'
import { requireLocale } from '@/lib/params'
import { alternates } from '@/lib/seo'

export const revalidate = 300

type Params = Promise<{ lang: string; slug: string }>

async function load(lang: Locale, slug: string): Promise<Place> {
  try {
    return await getPlace(lang, slug)
  } catch (error) {
    if (error instanceof NotFoundError) notFound()
    throw error
  }
}

const excerpt = (value: string, max = 155) =>
  value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang, slug } = await params
  if (!isLocale(lang)) return {}
  const place = await load(lang, slug)
  const image = place.images[0]

  return {
    title: place.name,
    description: place.description
      ? excerpt(place.description)
      : [place.category.name, place.address].filter(Boolean).join(' · '),
    alternates: alternates(lang, `/p/${slug}`),
    openGraph: {
      title: place.name,
      images: image ? [{ url: image.url, width: image.width ?? undefined, height: image.height ?? undefined }] : [],
    },
  }
}

/**
 * schema.org data for search engines: name, address, coordinates and hours in a
 * form they can show directly in results. `<` is escaped because the JSON sits
 * inside a script tag, and a place name containing "</script>" would otherwise
 * end it early.
 */
function StructuredData({ place, url }: { place: Place; url: string }) {
  const days: Record<string, string> = {
    mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
    fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
  }

  const data = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: place.name,
    url,
    description: place.description ?? undefined,
    telephone: place.phone ?? undefined,
    image: place.images.map((image) => image.url),
    address: place.address ?? undefined,
    geo: place.location
      ? { '@type': 'GeoCoordinates', latitude: place.location.lat, longitude: place.location.lng }
      : undefined,
    // Search engines show a price range in results when it is given.
    priceRange: place.price
      ? [place.price.min, place.price.max].filter((value) => value !== null).join('-') || undefined
      : undefined,
    aggregateRating:
      place.rating !== null && place.rating_count > 0
        ? { '@type': 'AggregateRating', ratingValue: place.rating, reviewCount: place.rating_count }
        : undefined,
    openingHoursSpecification: WEEKDAYS.flatMap((day) =>
      (place.opening_hours?.[day] ?? []).map(([opens, closes]) => ({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: days[day],
        opens,
        closes,
      })),
    ),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}

export default async function PlacePage({ params }: { params: Params }) {
  const { lang: rawLang, slug } = await params
  const lang = requireLocale(rawLang)
  const text = t(lang)
  // Independent reads: the place, and the catalog its amenity slugs resolve
  // against. Both are cached, so this costs one round trip on a cold page.
  //
  // The catalog is allowed to fail. It decorates the page - a row of chips -
  // and losing it should cost those chips, not the opening hours and the phone
  // number. It is also the one read that fails before migration 0007 has run.
  const [place, amenityCatalog] = await Promise.all([
    load(lang, slug),
    getAmenities(lang).catch((error: unknown) => {
      console.error('amenity catalog unavailable', error)
      return []
    }),
  ])

  const directions = place.location
    ? `https://www.google.com/maps/dir/?api=1&destination=${place.location.lat},${place.location.lng}`
    : null

  return (
    <article className="pb-4">
      <StructuredData place={place} url={`${config.siteUrl}/${lang}/p/${place.slug}`} />

      <nav className="mb-4">
        <Link
          href={`/${lang}/c/${place.category.slug}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent-soft)] px-3 py-1 text-xs font-bold text-[var(--color-accent)] transition hover:opacity-80"
        >
          <CategoryIcon category={place.category} size={14} />
          {place.category.name}
        </Link>
      </nav>

      {/* The facts someone decides on - open, how good, how much - sit
          together under the name, before the photos rather than after. */}
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{place.name}</h1>
        {/* Spacing separates these, not punctuation. Each is already a
            distinct shape - a coloured chip, a star and a number, a word and
            an amount - and any separator character has to survive two cases
            that do happen here: OpenNow renders nothing until it has mounted,
            and the line wraps on a phone, which would strand the mark at the
            start of the second line. */}
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <OpenNow hours={place.opening_hours} timeZone={config.timeZone} locale={lang} />
          {place.rating !== null && (
            <Rating rating={place.rating} count={place.rating_count} locale={lang} />
          )}
          <Price price={place.price} locale={lang} />
        </div>
      </header>

      <Gallery images={place.images} name={place.name} locale={lang} />

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0 space-y-8">
          {place.description && (
            <section>
              <h2 className="mb-2 text-sm font-bold text-[var(--color-muted)]">{text.about}</h2>
              <p className="whitespace-pre-line leading-relaxed">{place.description}</p>
            </section>
          )}

          <Amenities amenities={place.amenities} catalog={amenityCatalog} label={text.amenities} />

          {place.location && (
            <section>
              <h2 className="mb-3 text-sm font-bold text-[var(--color-muted)]">{text.onTheMap}</h2>
              <PlaceMap pins={[{ id: place.id, name: place.name, ...place.location }]} />
            </section>
          )}
        </div>

        {/* Follows the page on a wide screen: the hours and the phone number
            are what someone scrolls back up for. */}
        <aside className="space-y-5 self-start rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5 lg:sticky lg:top-6">
          <dl className="space-y-4 text-sm">
            {place.address && (
              <Fact icon={<PinIcon />} label={text.address}>
                {place.address}
              </Fact>
            )}
            {place.phone && (
              <Fact icon={<PhoneIcon />} label={text.phone}>
                <a
                  href={`tel:${place.phone.replace(/\s+/g, '')}`}
                  className="text-[var(--color-accent)] hover:underline"
                >
                  {place.phone}
                </a>
              </Fact>
            )}
            {place.price && (
              <Fact icon={<TagIcon />} label={text.price}>
                <Price price={place.price} locale={lang} />
              </Fact>
            )}
            {place.website && (
              <Fact icon={<GlobeIcon />} label={text.website}>
                {/* Entered by an admin, but still an outbound link to a site
                    we do not control. */}
                <a
                  href={place.website}
                  target="_blank"
                  rel="noopener nofollow"
                  className="block truncate text-[var(--color-accent)] hover:underline"
                >
                  {place.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </a>
              </Fact>
            )}
          </dl>

          <SaveButton id={place.id} locale={lang} variant="full" />

          {directions && (
            <a
              href={directions}
              target="_blank"
              rel="noopener"
              className="flex items-center justify-center gap-2 rounded-full bg-[var(--color-accent)] px-4 py-3 text-center text-sm font-bold text-[var(--color-on-accent)] transition hover:opacity-90 active:scale-[0.98]"
            >
              <DirectionsIcon />
              {text.directions}
            </a>
          )}

          {place.opening_hours && (
            <section className="border-t border-[var(--color-line)] pt-5">
              <h2 className="mb-2 text-sm font-bold">{text.hours}</h2>
              <HoursTable hours={place.opening_hours} locale={lang} />
            </section>
          )}

          <PlaceLinks links={place.links} label={text.links} />
        </aside>
      </div>
    </article>
  )
}

/** One labelled row in the sidebar, with its icon in the margin. */
function Fact({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 shrink-0 text-[var(--color-accent)]">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs text-[var(--color-muted)]">{label}</dt>
        <dd className="mt-0.5">{children}</dd>
      </div>
    </div>
  )
}

const iconProps = {
  'aria-hidden': true,
  viewBox: '0 0 24 24',
  width: 18,
  height: 18,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

const PinIcon = () => (
  <svg {...iconProps}>
    <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
)

const PhoneIcon = () => (
  <svg {...iconProps}>
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z" />
  </svg>
)

const GlobeIcon = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18z" />
  </svg>
)

const TagIcon = () => (
  <svg {...iconProps}>
    <path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9z" />
    <circle cx="7.5" cy="7.5" r="1.5" />
  </svg>
)

const DirectionsIcon = () => (
  <svg {...iconProps} width={16} height={16}>
    <path d="M12 2 2 22l10-5 10 5z" />
  </svg>
)
