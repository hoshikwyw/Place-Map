import type { MetadataRoute } from 'next'
import { getCategories, getCategoryPlaces } from '@/lib/api'
import { config } from '@/lib/config'
import { DEFAULT_LOCALE, LOCALES } from '@/lib/i18n'

// Rendered per request so `next build` never calls the API (a static sitemap
// would be generated at build time, failing the deploy if the Worker is down).
// The API calls inside still go through the data cache, so a crawler hitting
// this repeatedly costs the Worker almost nothing.
export const dynamic = 'force-dynamic'

/** The API caps a page at 50; walking pages keeps this correct past that. */
const PAGE = 50
/** 50 pages of 50 is 2500 places - far beyond what this directory plans for. */
const MAX_PAGES = 50

/**
 * Every place in every language, with hreflang alternates, so each language
 * version is discoverable and understood as a translation of the others.
 * Slugs are language-independent, so one walk (in the default locale) covers
 * every language.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = config.siteUrl

  const entry = (path: string, priority: number): MetadataRoute.Sitemap[number] => ({
    url: `${base}/${DEFAULT_LOCALE}${path}`,
    changeFrequency: 'weekly',
    priority,
    alternates: {
      languages: Object.fromEntries(LOCALES.map((locale) => [locale, `${base}/${locale}${path}`])),
    },
  })

  // /search is left out on purpose: a search result page is not a page to
  // index. Every other route belongs here.
  const entries: MetadataRoute.Sitemap = [entry('', 1), entry('/map', 0.7)]
  const categories = await getCategories(DEFAULT_LOCALE)

  for (const category of categories) {
    entries.push(entry(`/c/${category.slug}`, 0.8))

    // Bounded: has_more comes from the API, and a wrong one would spin here
    // forever while the sitemap request hangs. Far more pages than a directory
    // of a few hundred places can fill.
    for (let page = 1; page <= MAX_PAGES; page++) {
      const { data, meta } = await getCategoryPlaces(DEFAULT_LOCALE, category.slug, page, PAGE)
      for (const place of data) entries.push(entry(`/p/${place.slug}`, 0.6))
      if (!meta.has_more) break
    }
  }

  return entries
}
