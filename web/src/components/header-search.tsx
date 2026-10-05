'use client'

import { usePathname } from 'next/navigation'
import type { Locale } from '@/lib/i18n'
import { SearchForm } from './search-form'

/**
 * The search box in the header - unless the page already leads with one.
 *
 * Two boxes doing one job is a worse page than either alone, and on a phone the
 * header one cost a whole row before any content. Two pages lead with their
 * own: the home page, whose hero search is its main action, and the results
 * page, whose box sits above the results carrying the current query. Every
 * other page has no search of its own, so the header provides it.
 */
export function HeaderSearch({ locale }: { locale: Locale }) {
  const pathname = usePathname()
  const path = pathname.replace(/\/$/, '')
  const leadsWithSearch = path === `/${locale}` || path === `/${locale}/search`

  if (leadsWithSearch) return null
  return <SearchForm locale={locale} compact />
}
