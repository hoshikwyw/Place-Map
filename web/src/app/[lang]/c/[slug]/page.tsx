import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Pagination } from '@/components/pagination'
import { PlaceCard } from '@/components/place-card'
import { PlaceMap } from '@/components/place-map'
import { NotFoundError, getCategories, getCategoryPlaces } from '@/lib/api'
import { config } from '@/lib/config'
import { isLocale, t, type Locale } from '@/lib/i18n'
import { requireLocale } from '@/lib/params'
import { alternates } from '@/lib/seo'

export const revalidate = 300

/** Twelve fills a 3x4 or 4x3 grid without a ragged last row. */
const PAGE_SIZE = 12

type Params = Promise<{ lang: string; slug: string }>
type Search = Promise<{ page?: string }>

const pageFrom = (raw?: string) => Math.max(1, Number(raw) || 1)

async function findCategory(lang: Locale, slug: string) {
  const categories = await getCategories(lang)
  return categories.find((category) => category.slug === slug)
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Params
  searchParams: Search
}): Promise<Metadata> {
  const { lang, slug } = await params
  if (!isLocale(lang)) return {}
  const page = pageFrom((await searchParams).page)
  const category = await findCategory(lang, slug)
  if (!category) return {}

  return {
    title: page > 1 ? `${category.name} (${page})` : category.name,
    alternates: alternates(lang, `/c/${slug}`),
  }
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Params
  searchParams: Search
}) {
  const { lang: rawLang, slug } = await params
  const lang = requireLocale(rawLang)
  const page = pageFrom((await searchParams).page)
  const text = t(lang)

  const category = await findCategory(lang, slug)
  if (!category) notFound()

  let result
  try {
    result = await getCategoryPlaces(lang, slug, page, PAGE_SIZE)
  } catch (error) {
    if (error instanceof NotFoundError) notFound()
    throw error
  }

  const { data: places, meta } = result
  const totalPages = Math.max(1, Math.ceil(meta.total / meta.limit))
  if (page > totalPages) notFound()

  const pins = places.flatMap((place) =>
    place.location
      ? [{ id: place.id, name: place.name, ...place.location, href: `/${lang}/p/${place.slug}` }]
      : [],
  )

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          <span aria-hidden className="mr-2">
            {category.icon}
          </span>
          {category.name}
        </h1>
        <p className="text-sm text-[var(--color-muted)]">{text.places(meta.total)}</p>
      </header>

      {places.length === 0 ? (
        <p className="py-12 text-center text-[var(--color-muted)]">{text.emptyCategory}</p>
      ) : (
        <>
          {/* The map shows this page's places, matching the list below it. */}
          <PlaceMap pins={pins} className="mb-6 h-64 sm:h-80" />

          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {places.map((place) => (
              <PlaceCard key={place.id} place={place} locale={lang} timeZone={config.timeZone} />
            ))}
          </ul>

          <Pagination
            locale={lang}
            page={page}
            totalPages={totalPages}
            hrefFor={(target) => `/${lang}/c/${slug}${target > 1 ? `?page=${target}` : ''}`}
          />
        </>
      )}
    </>
  )
}
