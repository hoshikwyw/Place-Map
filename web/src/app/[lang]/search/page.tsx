import Link from 'next/link'
import type { Metadata } from 'next'
import { Pagination } from '@/components/pagination'
import { BrowseResults } from '@/components/browse-results'
import { SearchForm } from '@/components/search-form'
import { getAmenities, getPlaces, searchPlaces } from '@/lib/api'
import { config } from '@/lib/config'
import { isLocale, t } from '@/lib/i18n'
import { requireLocale } from '@/lib/params'
import { EmptyState } from '@/components/feedback'
import { PageHeader } from '@/components/page-header'

const PAGE_SIZE = 12

type Params = Promise<{ lang: string }>
type Search = Promise<{ q?: string; page?: string; price?: string; amenities?: string }>

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
  const { q: rawQuery = '', page: rawPage, price, amenities } = await searchParams
  const query = rawQuery.trim()
  const page = Math.max(1, Number(rawPage) || 1)
  const text = t(lang)

  // An empty box means "show me everything", which is what someone expects
  // after clearing a search. One character is still too little to search on -
  // the API asks for two - so that keeps the hint.
  const browsing = query.length === 0
  const filters = { price, amenities }
  // With a filter on, an empty result is a filter that matched nothing, not an
  // empty directory - and the chips must stay on screen so it can be undone.
  const filtered = Boolean(price || amenities)
  const [results, catalog] = await Promise.all([
    browsing
      ? getPlaces(lang, page, PAGE_SIZE, filters)
      : query.length >= 2
        ? searchPlaces(lang, query, page, PAGE_SIZE, filters)
        : null,
    // The chips need names and icons. Decoration, so losing it costs the
    // chips rather than the page.
    getAmenities(lang).catch(() => []),
  ])
  const totalPages = results ? Math.max(1, Math.ceil(results.meta.total / results.meta.limit)) : 1
  const hrefFor = (target: number) =>
    browsing
      ? `/${lang}/search${target > 1 ? `?page=${target}` : ''}`
      : `/${lang}/search?q=${encodeURIComponent(query)}${target > 1 ? `&page=${target}` : ''}`

  return (
    <>
      <div className="mb-6 max-w-xl">
        <SearchForm locale={lang} defaultValue={query} />
      </div>

      {!results ? (
        <p className="text-[var(--color-muted)]">{text.queryTooShort}</p>
      ) : results.data.length === 0 && !filtered ? (
        // Somewhere to go next. "Nothing found" on its own is a dead end, and
        // this is the page a visitor reaches by typing a name the directory
        // does not have yet - the moment they are most able to help.
        <EmptyState
          actions={
            <>
              <Link href={`/${lang}`} className="btn btn-primary">
                {text.savedBrowse}
              </Link>
              <Link href={`/${lang}/suggest`} className="btn btn-secondary">
                {text.suggest.nav}
              </Link>
            </>
          }
        >
          {text.noResults(query)}
        </EmptyState>
      ) : (
        <>
          <PageHeader
            title={browsing ? text.allPlaces : text.searchResults(query)}
            className="mb-6"
          />

          <BrowseResults
          headingLevel={2}
            places={results.data}
            catalog={catalog}
            locale={lang}
            timeZone={config.timeZone}
            total={results.meta.total}
            showCategory
          />

          <Pagination locale={lang} page={page} totalPages={totalPages} hrefFor={hrefFor} />
        </>
      )}
    </>
  )
}
