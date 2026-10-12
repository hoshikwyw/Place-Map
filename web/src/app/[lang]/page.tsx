import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CategoryChips } from '@/components/category-chips'
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
      <Hero locale={lang} appStoreUrl={config.appStoreUrl} playStoreUrl={config.playStoreUrl} />

      <h2 className="mb-4 text-xl font-bold">{text.categories}</h2>

      <div className="mb-14">
        <CategoryChips categories={categories} locale={lang} allHref={`/${lang}#all-places`} />
      </div>

      {/* scroll-mt keeps the heading clear of the top edge when a page link
          jumps here. */}
      <section id="all-places" className="scroll-mt-6">
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <h2 className="text-xl font-bold">{text.allPlaces}</h2>
          <div className="flex items-center gap-3">
            <p className="text-sm font-semibold text-[var(--color-muted)]">{text.places(places.meta.total)}</p>
            <Link
              href={`/${lang}/map`}
              className="whitespace-nowrap rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-1.5 text-sm font-bold transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              {text.map}
            </Link>
          </div>
        </div>

        {places.data.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <Logo size={112} />
            <p className="text-[var(--color-muted)]">{text.emptyCategory}</p>
          </div>
        ) : (
          <>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
    </>
  )
}
