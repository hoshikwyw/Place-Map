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
import { Reviews } from '@/components/reviews'
import { SaveButton } from '@/components/save-button'
import { ShareButton } from '@/components/share-button'
import { PlaceMap } from '@/components/place-map'
import { NotFoundError, getAmenities, getPlace, getReviews } from '@/lib/api'
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
  const [place, amenityCatalog, reviews] = await Promise.all([
    load(lang, slug),
    getAmenities(lang).catch((error: unknown) => {
      console.error('amenity catalog unavailable', error)
      return []
    }),
    // Allowed to fail for the same reason as the catalog: reviews decorate the
    // page, and losing them should not cost the address and the hours. It is
    // also the read that fails on an API deployed before migration 0010.
    getReviews(lang, slug).catch((error: unknown) => {
      // A missing place is not a missing reviews list: all three reads start
      // together, so a 404 here just means `load()` is about to 404 the page.
      // Logging it would put "reviews unavailable" in the console for every
      // mistyped URL, which is noise that hides the real thing.
      if (!(error instanceof NotFoundError)) console.error('reviews unavailable', error)
      return []
    }),
  ])

  const directions = place.location
    ? `https://www.google.com/maps/dir/?api=1&destination=${place.location.lat},${place.location.lng}`
    : null

  return (
    <article className="pb-4">
      <StructuredData place={place} url={`${config.siteUrl}/${lang}/p/${place.slug}`} />

      {/* Where this page sits, and the way back up: the site, then the
          category. Predictable - the same two steps on every place page. */}
      <nav aria-label="Breadcrumb" className="mb-5">
        {/* -ml-2 cancels the first button's padding, so the breadcrumb's
            text starts on the same edge as the name below it. */}
        <ol className="-ml-2 flex flex-wrap items-center gap-1 text-sm text-[var(--color-muted)]">
          <li>
            <Link href={`/${lang}`} className="btn btn-ghost min-h-9 px-2 font-semibold pointer-coarse:min-h-11">
              {text.siteName}
            </Link>
          </li>
          <li aria-hidden className="select-none">›</li>
          <li>
            <Link
              href={`/${lang}/c/${place.category.slug}`}
              className="btn btn-ghost min-h-9 gap-1.5 px-2 font-semibold pointer-coarse:min-h-11"
            >
              <CategoryIcon category={place.category} size={15} />
              {place.category.name}
            </Link>
          </li>
        </ol>
      </nav>

      {/* The facts someone decides on - open, how good, how much - sit
          together under the name, before the photos rather than after. */}
      <header className="mb-7">
        <h1 className="break-words text-3xl font-extrabold tracking-tight sm:text-5xl">{place.name}</h1>
        {/* Where it is, right under what it is - the first thing anyone
            checks. The map and the directions are further down. */}
        {place.address && (
          <p className="mt-3 flex items-start gap-2 text-[var(--color-muted)]">
            <span className="mt-0.5 shrink-0">
              <PinIcon />
            </span>
            <span className="min-w-0 break-words">
              {/* Said, not shown: the pin already says it to anyone who sees it. */}
              <span className="sr-only">{text.address}: </span>
              {place.address}
            </span>
          </p>
        )}
        {/* Spacing separates these, not punctuation. Each is already a
            distinct shape - a coloured chip, a star and a number, a word and
            an amount - and any separator character has to survive two cases
            that do happen here: OpenNow renders nothing until it has mounted,
            and the line wraps on a phone, which would strand the mark at the
            start of the second line. */}
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <OpenNow hours={place.opening_hours} timeZone={config.timeZone} locale={lang} />
          {place.rating !== null && (
            <Rating rating={place.rating} count={place.rating_count} locale={lang} />
          )}
          <Price price={place.price} locale={lang} />
        </div>
      </header>

      {/* On a phone the sidebar stacks below the description, the map and
          the reviews - so getting there or ringing up, the two things most
          visits to a place page are for, sat at the very bottom. Here they
          come straight after the facts that decide them. From lg the sidebar
          sits beside the page and holds them instead. */}
      <Actions place={place} directions={directions} locale={lang} className="mb-6 lg:hidden" />

      <Gallery images={place.images} name={place.name} locale={lang} />

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
        {/* Sections divided by hairlines rather than gaps alone: on a long
            page the rules are what make the column scannable. */}
        <div className="min-w-0 divide-y divide-[var(--color-line)] [&>*]:py-8 [&>*:first-child]:pt-0">
          {place.description && (
            <section>
              <h2 className="section-title">{text.about}</h2>
              <p className="whitespace-pre-line break-words leading-relaxed">{place.description}</p>
            </section>
          )}

          <Amenities amenities={place.amenities} catalog={amenityCatalog} label={text.amenities} />

          {place.location && (
            <section>
              <h2 className="section-title">{text.onTheMap}</h2>
              <PlaceMap pins={[{ id: place.id, name: place.name, ...place.location }]} />
            </section>
          )}

          {/* Last in the column: somebody reads the place first, and decides
              whether to say something about it afterwards. */}
          <Reviews placeId={place.id} reviews={reviews} locale={lang} />
        </div>

        {/* Follows the page on a wide screen: the hours and the phone number
            are what someone scrolls back up for. */}
        {/* min-w-0 for the same reason the first column is minmax(0,1fr): a grid
            item will not shrink below its content, so a long address or a
            pasted link pushed this whole column - and the page - sideways. */}
        <aside className="min-w-0 space-y-6 self-start surface p-6 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
          <dl className="space-y-4 text-sm">
            {/* The address is under the name now, so it is not repeated here. */}
            {place.phone && (
              <Fact icon={<PhoneIcon />} label={text.phone}>
                <a
                  href={`tel:${place.phone.replace(/\s+/g, '')}`}
                  // inline-block with padding: a phone number is the thing
                  // people tap on this page, and 20px of text is a small
                  // target on a touchscreen.
                  className="-my-1 inline-block py-1 text-[var(--color-accent)] hover:underline"
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
                  className="-my-1 block truncate py-1 text-[var(--color-accent)] hover:underline"
                >
                  {place.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </a>
              </Fact>
            )}
          </dl>

          {/* Without Call: the number just above is already the link. */}
          <Actions
            place={place}
            directions={directions}
            locale={lang}
            withCall={false}
            className="hidden lg:block"
          />

          {place.opening_hours && (
            <section className="border-t border-[var(--color-line)] pt-5">
              <h2 className="mb-2 text-sm font-bold">{text.hours}</h2>
              <HoursTable hours={place.opening_hours} locale={lang} timeZone={config.timeZone} />
            </section>
          )}

          <PlaceLinks links={place.links} label={text.links} />

          {/* Quiet, and at the bottom. Somebody only wants this once they have
              read the page and found it wrong. */}
          <Link
            href={`/${lang}/suggest?about=${place.slug}`}
            className="block border-t border-[var(--color-line)] pt-4 text-xs text-[var(--color-muted)] underline-offset-2 transition hover:text-[var(--color-accent)] hover:underline"
          >
            {text.suggest.reportLink}
          </Link>
        </aside>
      </div>
    </article>
  )
}

/**
 * What a visitor does about a place: get there, ring, keep it, pass it on.
 *
 * Rendered in two places - under the name on a phone, in the sidebar from lg -
 * with only one ever displayed. `display: none` takes the other out of the
 * accessibility tree as well, so a screen reader meets one set of buttons.
 *
 * Directions is the one primary button: it is what most visits to a place
 * page end in, and two filled buttons side by side would leave neither
 * reading as the main thing. Calling sits beside it, outlined.
 */
function Actions({
  place,
  directions,
  locale,
  withCall = true,
  className,
}: {
  place: Place
  directions: string | null
  locale: Locale
  withCall?: boolean
  className: string
}) {
  const text = t(locale)
  const phone = withCall ? place.phone : null
  // One button alone takes the row; two share it.
  const reach = directions && phone ? 'grid-cols-2' : 'grid-cols-1'

  return (
    <div className={`space-y-2 ${className}`}>
      {(directions || phone) && (
        <div className={`grid gap-2 ${reach}`}>
          {directions && (
            <a href={directions} target="_blank" rel="noopener" className="btn btn-primary btn-lg w-full">
              <DirectionsIcon />
              {text.directions}
            </a>
          )}
          {phone && (
            <a href={`tel:${phone.replace(/\s+/g, '')}`} className="btn btn-secondary btn-lg w-full">
              <PhoneIcon />
              {text.call}
            </a>
          )}
        </div>
      )}

      {/* Save takes what it needs and Share stays compact: split evenly,
          "Save this place" wrapped onto two lines in the sidebar. */}
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <SaveButton id={place.id} locale={locale} variant="full" />
        <ShareButton title={place.name} locale={locale} />
      </div>
    </div>
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
    <div className="flex items-start gap-3">
      {/* The icon in a soft circle: a column of bare line icons read as
          bullet points; in circles they read as a set. */}
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
        {icon}
      </span>
      <div className="min-w-0 pt-0.5">
        <dt className="text-xs text-[var(--color-muted)]">{label}</dt>
        {/* break-words: an address or a pasted link has no spaces to wrap on,
            and this column is narrow. */}
        <dd className="mt-0.5 break-words">{children}</dd>
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
