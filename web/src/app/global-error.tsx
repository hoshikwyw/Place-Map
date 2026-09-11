'use client'

import { useEffect } from 'react'
import { DEFAULT_LOCALE, isLocale, t } from '@/lib/i18n'
import './globals.css'

/**
 * The last-resort error page: what a visitor sees when a full page load fails,
 * which in practice means the API is unreachable.
 *
 * It replaces the root layout entirely, so it renders its own `<html>` and
 * deliberately nothing else from the site - no header, no data. Anything that
 * could fail again here would leave the visitor on Next's generic
 * "Application error" screen instead of this one.
 *
 * The locale is read off the URL directly, not via usePathname: this can render
 * when the router itself is what broke.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const segment = typeof window === 'undefined' ? '' : (window.location.pathname.split('/')[1] ?? '')
  const locale = isLocale(segment) ? segment : DEFAULT_LOCALE
  const text = t(locale)

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang={locale}>
      <body className="flex min-h-dvh flex-col items-center justify-center px-4 text-center antialiased">
        <a href={`/${locale}`} className="mb-8 font-semibold tracking-tight">
          {text.siteName}
        </a>
        <h1 className="mb-2 text-2xl font-semibold">{text.errorTitle}</h1>
        <p className="mb-6 max-w-md text-[var(--color-muted)]">{text.errorBody}</p>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={reset}
            className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white dark:text-black"
          >
            {text.tryAgain}
          </button>
          {/* A plain <a>, not next/link: a full reload is the most likely thing
              to recover from whatever broke the client router. */}
          <a href={`/${locale}`} className="text-sm text-[var(--color-accent)] hover:underline">
            {text.backHome}
          </a>
        </div>
      </body>
    </html>
  )
}
