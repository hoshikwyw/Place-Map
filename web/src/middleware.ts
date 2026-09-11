import { NextResponse, type NextRequest } from 'next/server'
import { DEFAULT_LOCALE, LOCALES, type Locale } from './lib/i18n'

/**
 * Every page lives under a locale prefix: /en/..., /uz/...
 *
 * The language is in the path rather than a cookie so each language version
 * has its own URL - search engines index both, links share the language they
 * were copied in, and the page can be cached per URL without varying on a
 * cookie. A bare path is redirected once, using the browser's language.
 */

function pickLocale(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE

  const ranked = header
    .split(',')
    .map((part) => {
      const [tag = '', ...params] = part.trim().split(';')
      const q = params.find((p) => p.trim().startsWith('q='))?.trim().slice(2)
      return { base: tag.trim().toLowerCase().split('-')[0] ?? '', q: q ? Number(q) : 1 }
    })
    .filter((entry) => entry.base && Number.isFinite(entry.q))
    .sort((a, b) => b.q - a.q)

  const match = ranked.find((entry) => (LOCALES as readonly string[]).includes(entry.base))
  return (match?.base as Locale | undefined) ?? DEFAULT_LOCALE
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const locale = LOCALES.find((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))

  if (locale) {
    // Passed on as a request header for app/not-found.tsx, which sits above
    // the [lang] layout and so never receives the [lang] param.
    const forwarded = new Headers(request.headers)
    forwarded.set('x-locale', locale)
    return NextResponse.next({ request: { headers: forwarded } })
  }

  const url = request.nextUrl.clone()
  url.pathname = `/${pickLocale(request.headers.get('accept-language'))}${pathname === '/' ? '' : pathname}`
  return NextResponse.redirect(url)
}

export const config = {
  // Everything except Next internals, the SEO files and anything with a file
  // extension (favicons, images).
  matcher: ['/((?!_next|api|sitemap\\.xml|robots\\.txt|.*\\..*).*)'],
}
