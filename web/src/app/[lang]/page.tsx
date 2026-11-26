import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppPromo } from '@/components/app-promo'
import { Glyph } from '@/components/icons'
import { Logo } from '@/components/logo'
import { Pagination } from '@/components/pagination'
import { Hero } from '@/components/hero'
import { PlaceCard } from '@/components/place-card'
import { getCategories, getPlaces } from '@/lib/api'
import { config } from '@/lib/config'
import { isLocale, t } from '@/lib/i18n'
import { requireLocale } from '@/lib/params'
import { alternates } from '@/lib/seo'

export const revalidate = 300

/** Twelve fills a 3x4 or 4x3 grid without a ragged last row. */
const PAGE_SIZE = 12

type Params = Promise<{ lang: string }>
type Search = Promise<{ page?: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params
  return isLocale(lang) ? { alternates: alternates(lang, '') } : {}
}

export default async function HomePage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const lang = requireLocale((await params).lang)
  const page = Math.max(1, Number((await searchParams).page) || 1)
  const text = t(lang)

  // Categories and the unfiltered list are independent, so fetch them together.
  const [categories, places] = await Promise.all([getCategories(lang), getPlaces(lang, page, PAGE_SIZE)])

  const totalPages = Math.max(1, Math.ceil(places.meta.total / places.meta.limit))
  if (page > totalPages) notFound()

  return (
    <>
      {/* The categories are inside the hero now, under the search. */}
      <Hero locale={lang} categories={categories} />

      {/* scroll-mt keeps the heading clear of the top edge when a page link
          jumps here. */}
      <section id="all-places" className="scroll-mt-6">
        {/* Title and count stacked on the left, the way to the map on the
            right: the count describes the list, so it belongs with its name
            rather than beside the button. */}
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">{text.allPlaces}</h2>
            <p className="mt-1 text-sm text-[var(--color-muted)]">{text.places(places.meta.total)}</p>
          </div>
          <Link href={`/${lang}/map`} className="btn btn-secondary shrink-0">
            <Glyph name="explore" size={17} />
            {text.map}
          </Link>
        </div>

        {places.data.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <Logo size={112} />
            <p className="text-[var(--color-muted)]">{text.emptyCategory}</p>
          </div>
        ) : (
          <>
            <ul className="grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
              {places.data.map((place) => (
                <PlaceCard key={place.id} place={place} locale={lang} timeZone={config.timeZone} showCategory />
              ))}
            </ul>

            {/* Page links land on the list itself, not back at the top of the
                page above the hero and categories. */}
            <Pagination
              locale={lang}
              page={page}
              totalPages={totalPages}
              hrefFor={(target) => `/${lang}${target > 1 ? `?page=${target}` : ''}#all-places`}
            />
          </>
        )}
      </section>

      <AppPromo locale={lang} appStoreUrl={config.appStoreUrl} playStoreUrl={config.playStoreUrl} />
    </>
  )
}
