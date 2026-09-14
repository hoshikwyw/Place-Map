'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { Mascot } from '@/components/mascot'
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
    <div className="flex flex-col items-center py-16 text-center">
      <Mascot size={120} className="mb-6" />
      <h1 className="mb-2 text-3xl font-extrabold">{text.errorTitle}</h1>
      <p className="mb-8 max-w-md text-[var(--color-muted)]">{text.errorBody}</p>
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-[var(--color-accent)] px-6 py-2.5 text-sm font-bold text-[var(--color-on-accent)] transition hover:opacity-90"
        >
          {text.tryAgain}
        </button>
        <Link
          href={`/${locale}`}
          className="rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-6 py-2.5 text-sm font-bold transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
        >
          {text.backHome}
        </Link>
      </div>
    </div>
  )
}
