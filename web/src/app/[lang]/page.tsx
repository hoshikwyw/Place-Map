import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Mascot } from '@/components/mascot'
import { Pagination } from '@/components/pagination'
import { PlaceCard } from '@/components/place-card'
import { SearchForm } from '@/components/search-form'
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
      <section className="mb-14 flex flex-col-reverse items-center gap-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full max-w-xl">
          <h1 className="mb-3 text-4xl font-extrabold tracking-tight sm:text-5xl">{text.siteName}</h1>
          <p className="mb-7 text-lg text-[var(--color-muted)]">{text.tagline}</p>
          <SearchForm locale={lang} />
        </div>
        {/* The only place the mascot moves: it is the page's welcome. */}
        <Mascot size={176} bob className="shrink-0" />
      </section>

      <h2 className="mb-5 text-xl font-extrabold">{text.categories}</h2>

      <ul className="mb-14 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {categories.map((category) => (
          <li key={category.id}>
            <Link
              href={`/${lang}/c/${category.slug}`}
              className="flex h-full flex-col items-start gap-3 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-4 transition hover:-translate-y-0.5 hover:border-[var(--color-accent)]"
            >
              <span
                aria-hidden
                className="flex size-12 items-center justify-center rounded-full bg-[var(--color-coral-soft)] text-2xl"
              >
                {category.icon ?? '📍'}
              </span>
              <span className="font-bold">{category.name}</span>
            </Link>
          </li>
        ))}
      </ul>

      {/* scroll-mt keeps the heading clear of the top edge when a page link
          jumps here. */}
      <section id="all-places" className="scroll-mt-6">
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <h2 className="text-xl font-extrabold">{text.allPlaces}</h2>
          <p className="text-sm font-semibold text-[var(--color-muted)]">{text.places(places.meta.total)}</p>
        </div>

        {places.data.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <Mascot size={112} />
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
