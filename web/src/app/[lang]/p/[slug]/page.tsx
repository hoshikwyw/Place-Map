import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { WEEKDAYS, type Place } from '@place-map/shared'
import { CategoryIcon } from '@/components/category-icon'
import { Gallery } from '@/components/gallery'
import { HoursTable } from '@/components/hours-table'
import { OpenNow } from '@/components/open-now'
import { PlaceLinks } from '@/components/place-links'
import { Rating } from '@/components/rating'
import { PlaceMap } from '@/components/place-map'
import { NotFoundError, getPlace } from '@/lib/api'
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
  const place = await load(lang, slug)

  const directions = place.location
    ? `https://www.google.com/maps/dir/?api=1&destination=${place.location.lat},${place.location.lng}`
    : null

  return (
    <article>
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

      <header className="mb-6">
        <h1 className="mb-3 text-4xl font-bold tracking-tight">{place.name}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <OpenNow hours={place.opening_hours} timeZone={config.timeZone} locale={lang} />
          <Rating rating={place.rating} count={place.rating_count} locale={lang} size="lg" />
        </div>
      </header>

      <Gallery images={place.images} name={place.name} locale={lang} />

      <div className="grid gap-8 md:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          {place.description && (
            <p className="whitespace-pre-line leading-relaxed">{place.description}</p>
          )}
          <PlaceMap
            pins={place.location ? [{ id: place.id, name: place.name, ...place.location }] : []}
          />
        </div>

        <aside className="space-y-6 self-start rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
          <dl className="space-y-3 text-sm">
            {place.address && (
              <div>
                <dt className="text-[var(--color-muted)]">{text.address}</dt>
                <dd>{place.address}</dd>
              </div>
            )}
            {place.phone && (
              <div>
                <dt className="text-[var(--color-muted)]">{text.phone}</dt>
                <dd>
                  <a href={`tel:${place.phone.replace(/\s+/g, '')}`} className="text-[var(--color-accent)] hover:underline">
                    {place.phone}
                  </a>
                </dd>
              </div>
            )}
            {place.website && (
              <div>
                <dt className="text-[var(--color-muted)]">{text.website}</dt>
                <dd className="truncate">
                  {/* Entered by an admin, but still an outbound link to a site
                      we do not control. */}
                  <a href={place.website} target="_blank" rel="noopener nofollow" className="text-[var(--color-accent)] hover:underline">
                    {place.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  </a>
                </dd>
              </div>
            )}
          </dl>

          <div className="mt-5">
            <PlaceLinks links={place.links} label={text.links} />
          </div>

          {directions && (
            <a
              href={directions}
              target="_blank"
              rel="noopener"
              className="block rounded-full bg-[var(--color-accent)] px-4 py-3 text-center text-sm font-bold text-[var(--color-on-accent)] transition hover:opacity-90 active:scale-[0.98]"
            >
              {text.directions}
            </a>
          )}

          {place.opening_hours && (
            <section>
              <h2 className="mb-2 text-sm font-bold">{text.hours}</h2>
              <HoursTable hours={place.opening_hours} locale={lang} />
            </section>
          )}
        </aside>
      </div>
    </article>
  )
}
