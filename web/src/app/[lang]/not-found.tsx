'use client'

import { usePathname } from 'next/navigation'
import { NotFoundContent } from '@/components/not-found-content'
import { DEFAULT_LOCALE, isLocale } from '@/lib/i18n'

/**
 * The 404 for client-side navigation - following a link to a place that has
 * since been removed. A full page load uses app/global-not-found.tsx instead;
 * both render the same content.
 *
 * not-found receives no params, so the locale is read back off the URL.
 */
export default function NotFound() {
  const segment = usePathname().split('/')[1] ?? ''
  return <NotFoundContent locale={isLocale(segment) ? segment : DEFAULT_LOCALE} />
}
