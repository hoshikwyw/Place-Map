import 'server-only'
import type { Metadata } from 'next'
import { config } from './config'
import { LOCALES, type Locale } from './i18n'

/**
 * Canonical and hreflang links for a locale-independent path like `/p/cafe`.
 *
 * Every language version names every other one, so a search engine treats
 * /en/p/cafe and /uz/p/cafe as translations of one page rather than duplicate
 * content competing with itself.
 */
export function alternates(locale: Locale, path: string): Metadata['alternates'] {
  const base = config.siteUrl
  return {
    canonical: `${base}/${locale}${path}`,
    languages: Object.fromEntries([
      ...LOCALES.map((l) => [l, `${base}/${l}${path}`]),
      ['x-default', `${base}/en${path}`],
    ]),
  }
}
