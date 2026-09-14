import { headers } from 'next/headers'
import { Header } from '@/components/header'
import { NotFoundContent } from '@/components/not-found-content'
import { nunito } from '@/lib/font'
import { DEFAULT_LOCALE, isLocale, t } from '@/lib/i18n'
import './globals.css'

/**
 * The 404 for anything that escapes `[lang]/layout.tsx` - an unknown locale, or
 * a not-found raised before the locale layout has rendered.
 *
 * It sits under the pass-through `app/layout.tsx`, which renders no document,
 * so this renders its own `<html>`, header and styles. The locale arrives as
 * `x-locale`, set by the middleware from the path prefix, because this file
 * receives no route params.
 *
 * Inside a known locale, `[lang]/not-found.tsx` handles it instead; both render
 * the same content.
 */
export default async function RootNotFound() {
  const requested = (await headers()).get('x-locale') ?? ''
  const locale = isLocale(requested) ? requested : DEFAULT_LOCALE

  return (
    // See [lang]/layout.tsx: extensions write attributes onto <html>/<body>.
    <html lang={locale} className={nunito.variable} suppressHydrationWarning>
      <head>
        <title>{`${t(locale).notFoundTitle} · ${t(locale).siteName}`}</title>
      </head>
      <body className="flex min-h-dvh flex-col antialiased" suppressHydrationWarning>
        <Header locale={locale} />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
          <NotFoundContent locale={locale} />
        </main>
      </body>
    </html>
  )
}
