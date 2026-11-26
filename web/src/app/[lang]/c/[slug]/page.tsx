import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CategoryChips } from '@/components/category-chips'
import { CategoryIcon } from '@/components/category-icon'
import { Pagination } from '@/components/pagination'
import { BrowseResults } from '@/components/browse-results'
import { PlaceMap } from '@/components/place-map'
import { NotFoundError, getAmenities, getCategories, getCategoryPlaces } from '@/lib/api'
import { config } from '@/lib/config'
import { isLocale, t, type Locale } from '@/lib/i18n'
import { requireLocale } from '@/lib/params'
import { alternates } from '@/lib/seo'
import { EmptyState } from '@/components/feedback'
import Link from 'next/link'
import { PageHeader } from '@/components/page-header'

export const revalidate = 300

/** Twelve fills a 3x4 or 4x3 grid without a ragged last row. */
const PAGE_SIZE = 12

type Params = Promise<{ lang: string; slug: string }>
type Search = Promise<{ page?: string; price?: string; amenities?: string }>

const pageFrom = (raw?: string) => Math.max(1, Number(raw) || 1)

async function findCategory(lang: Locale, slug: string) {
  const categories = await getCategories(lang)
  return { categories, category: categories.find((entry) => entry.slug === slug) }
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
  const { category } = await findCategory(lang, slug)
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
  const { page: rawPage, price, amenities } = await searchParams
  const page = pageFrom(rawPage)
  const text = t(lang)

  const { categories, category } = await findCategory(lang, slug)
  if (!category) notFound()

  let result
  try {
    result = await getCategoryPlaces(lang, slug, page, PAGE_SIZE, { price, amenities })
  } catch (error) {
    if (error instanceof NotFoundError) notFound()
    throw error
  }

  // The chips need names and icons. Decoration, so losing it costs the chips
  // rather than the page.
  const catalog = await getAmenities(lang).catch(() => [])

  // With a filter on, an empty result means the filter matched nothing, so the
  // chips have to stay on screen to be undone.
  const filtered = Boolean(price || amenities)

  const { data: places, meta } = result
  const totalPages = Math.max(1, Math.ceil(meta.total / meta.limit))
  if (page > totalPages && page > 1) notFound()

  const pins = places.flatMap((place) =>
    place.location
      ? [{ id: place.id, name: place.name, ...place.location, href: `/${lang}/p/${place.slug}` }]
      : [],
  )

  return (
    <>
      {/* The same row as the home page, with this category marked, so moving
          between categories does not mean going back first. */}
      <div className="mb-6">
        <CategoryChips
          categories={categories}
          locale={lang}
          current={category.slug}
          allHref={`/${lang}#all-places`}
        />
      </div>

      <PageHeader
        title={category.name}
        intro={text.places(meta.total)}
        icon={<CategoryIcon category={category} size={category.icon_image ? 56 : 30} />}
      />

      {places.length === 0 && !filtered ? (
        <EmptyState
          actions={
            <Link href={`/${lang}/suggest`} className="btn btn-secondary">
              {text.suggest.nav}
            </Link>
          }
        >
          {text.emptyCategory}
        </EmptyState>
      ) : (
        <>
          {/* The map shows this page's places, matching the list below it. */}
          <PlaceMap pins={pins} className="mb-6 h-64 sm:h-80" />

          <BrowseResults
          headingLevel={2}
            places={places}
            catalog={catalog}
            locale={lang}
            timeZone={config.timeZone}
            total={meta.total}
          />

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
