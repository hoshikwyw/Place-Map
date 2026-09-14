'use client'

import { useEffect } from 'react'
import { nunito } from '@/lib/font'
import { DEFAULT_LOCALE, isLocale, t } from '@/lib/i18n'
import './globals.css'

/**
 * The last-resort error page: what a visitor sees when a full page load fails,
 * which in practice means the API is unreachable.
 *
 * It replaces the root layout entirely, so it renders its own `<html>` and
 * deliberately nothing else from the site - no header, no data. Anything that
 * could fail again here would leave the visitor on Next's generic
 * "Application error" screen instead of this one. The mascot is a static file,
 * so it is safe to show.
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
    <html lang={locale} className={nunito.variable}>
      <body className="flex min-h-dvh flex-col items-center justify-center px-4 text-center antialiased">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mascot.svg" alt="" aria-hidden width={120} height={120} className="mb-6" />
        <h1 className="mb-2 text-3xl font-extrabold">{text.errorTitle}</h1>
        <p className="mb-8 max-w-md text-[var(--color-muted)]">{text.errorBody}</p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-[var(--color-accent)] px-6 py-2.5 text-sm font-bold text-[var(--color-on-accent)] transition hover:opacity-90"
          >
            {text.tryAgain}
          </button>
          {/* A plain <a>, not next/link: a full reload is the most likely thing
              to recover from whatever broke the client router. */}
          <a
            href={`/${locale}`}
            className="rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-6 py-2.5 text-sm font-bold transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          >
            {text.backHome}
          </a>
        </div>
      </body>
    </html>
  )
}
