'use client'

import { useEffect } from 'react'
import { StatusContent } from '@/components/status-content'
import { fontVariables } from '@/lib/font'
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
    // See [lang]/layout.tsx: extensions write attributes onto <html>/<body>.
    <html lang={locale} className={fontVariables} suppressHydrationWarning>
      <body
        className="flex min-h-dvh flex-col items-center justify-center px-4 antialiased"
        suppressHydrationWarning
      >
        <StatusContent
          title={text.errorTitle}
          body={text.errorBody}
          // The static file rather than the Logo component: the least that
          // has to work for this page to draw, when something already didn't.
          // eslint-disable-next-line @next/next/no-img-element
          art={<img src="/logo.svg" alt="" aria-hidden width={112} height={112} />}
          actions={
            <>
              <button type="button" onClick={reset} className="btn btn-primary px-6">
                {text.tryAgain}
              </button>
              {/* A plain <a>, not next/link: a full reload is the most likely
                  thing to recover from whatever broke the client router. */}
              <a href={`/${locale}`} className="btn btn-secondary px-6">
                {text.backHome}
              </a>
            </>
          }
        />
      </body>
    </html>
  )
}
