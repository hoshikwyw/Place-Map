'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { StatusContent } from '@/components/status-content'
import { DEFAULT_LOCALE, isLocale, t } from '@/lib/i18n'

/**
 * Shown when a page throws - almost always the API being unreachable. The
 * header, search and language switcher stay usable around it, instead of the
 * visitor landing on a bare framework error page with no way back.
 *
 * The response status stays 500, so uptime monitoring still sees the outage.
 */
export default function PageError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const segment = usePathname().split('/')[1] ?? ''
  const locale = isLocale(segment) ? segment : DEFAULT_LOCALE
  const text = t(locale)

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <StatusContent
      title={text.errorTitle}
      body={text.errorBody}
      actions={
        <>
          <button type="button" onClick={reset} className="btn btn-primary px-6">
            {text.tryAgain}
          </button>
          <Link href={`/${locale}`} className="btn btn-secondary px-6">
            {text.backHome}
          </Link>
        </>
      }
    />
  )
}
