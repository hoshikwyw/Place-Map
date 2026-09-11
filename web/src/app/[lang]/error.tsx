'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
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
    <div className="py-16 text-center">
      <h1 className="mb-2 text-2xl font-semibold">{text.errorTitle}</h1>
      <p className="mb-6 text-[var(--color-muted)]">{text.errorBody}</p>
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white dark:text-black"
        >
          {text.tryAgain}
        </button>
        <Link href={`/${locale}`} className="text-sm text-[var(--color-accent)] hover:underline">
          {text.backHome}
        </Link>
      </div>
    </div>
  )
}
