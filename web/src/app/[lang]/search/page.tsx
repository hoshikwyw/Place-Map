import type { Metadata } from 'next'
import { Pagination } from '@/components/pagination'
import { PlaceCard } from '@/components/place-card'
import { SearchForm } from '@/components/search-form'
import { searchPlaces } from '@/lib/api'
import { config } from '@/lib/config'
import { isLocale, t } from '@/lib/i18n'
import { requireLocale } from '@/lib/params'

const PAGE_SIZE = 12

type Params = Promise<{ lang: string }>
type Search = Promise<{ q?: string; page?: string }>

/**
 * Search result pages are thin, near-infinite and duplicate the category pages,
 * so they are kept out of the index. Crawlers may still follow the links in
 * them to the place pages, which are what should rank.
 */
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Params
  searchParams: Search
}): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  const { q } = await searchParams
  return {
    title: q ? t(lang).searchResults(q) : t(lang).search,
    robots: { index: false, follow: true },
  }
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Params
  searchParams: Search
}) {
  const lang = requireLocale((await params).lang)
  const { q: rawQuery = '', page: rawPage } = await searchParams
  const query = rawQuery.trim()
  const page = Math.max(1, Number(rawPage) || 1)
  const text = t(lang)

  const results = query.length >= 2 ? await searchPlaces(lang, query, page, PAGE_SIZE) : null
  const totalPages = results ? Math.max(1, Math.ceil(results.meta.total / results.meta.limit)) : 1

  return (
    <>
      <div className="mb-6 max-w-xl">
        <SearchForm locale={lang} defaultValue={query} />
      </div>

      {!results ? (
        <p className="text-[var(--color-muted)]">{text.queryTooShort}</p>
      ) : results.data.length === 0 ? (
        <p className="py-12 text-center text-[var(--color-muted)]">{text.noResults(query)}</p>
      ) : (
        <>
          <h1 className="mb-1 text-xl font-semibold">{text.searchResults(query)}</h1>
          <p className="mb-6 text-sm text-[var(--color-muted)]">{text.places(results.meta.total)}</p>

          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.data.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                locale={lang}
                timeZone={config.timeZone}
                showCategory
              />
            ))}
          </ul>

          <Pagination
            locale={lang}
            page={page}
            totalPages={totalPages}
            hrefFor={(target) =>
              `/${lang}/search?q=${encodeURIComponent(query)}${target > 1 ? `&page=${target}` : ''}`
            }
          />
        </>
      )}
    </>
  )
}
