import type { Metadata } from 'next'
import Link from 'next/link'
import { ServiceWorker } from '@/components/service-worker'
import { NavigationProgress } from '@/components/navigation-progress'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { Assistant } from '@/components/assistant'
import { Glyph } from '@/components/icons'
import { Header } from '@/components/header'
import { Logo } from '@/components/logo'
import { config } from '@/lib/config'
import { fontVariables } from '@/lib/font'
import { cookies } from 'next/headers'
import { THEME_COOKIE, THEME_SCRIPT, isThemeChoice } from '@/lib/theme'
import { isLocale, t } from '@/lib/i18n'
import '../globals.css'

/**
 * This layout renders `<html>` - the app/ layout above it only passes children
 * through - so `<html lang>` is correct on every page -
 * screen readers pick their pronunciation from it, and search engines use it
 * alongside hreflang.
 *
 * Deliberately no generateStaticParams. Listing the locales would prerender
 * every locale's pages during `next build`, which calls the API - so a deploy
 * would fail whenever the Worker was down or not deployed yet. Instead each
 * page renders on its first request and is then cached for `revalidate`
 * seconds: the same caching, with the build no longer coupled to the API.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>
}): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  const text = t(lang)

  return {
    metadataBase: new URL(config.siteUrl),
    title: { default: text.siteName, template: `%s · ${text.siteName}` },
    description: text.tagline,
    openGraph: {
      siteName: text.siteName,
      locale: lang,
      type: 'website',
      // The default link preview. Without it every page but a place shared as
      // a bare line of text - which is most of what gets pasted into Viber or
      // Messenger. A place page overrides this with its own photo, because a
      // picture of the place beats a picture of the logo.
      images: [{ url: '/og.png', width: 1200, height: 630, alt: text.siteName }],
    },
    twitter: { card: 'summary_large_image' },
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()

  // Rendered into the HTML rather than set by script: switching language
  // rebuilds <html>, and an attribute added afterwards means one painted frame
  // of the device's theme - the flash that looked like the language toggle
  // changing the theme.
  const chosen = (await cookies()).get(THEME_COOKIE)?.value
  const theme = isThemeChoice(chosen) ? chosen : undefined

  return (
    // suppressHydrationWarning: browser extensions (colour pickers, document
    // viewers) write attributes onto <html> and <body> before React hydrates.
    // It covers only these two elements' own attributes, never their children,
    // so a real mismatch inside the page is still reported.
    <html lang={lang} data-theme={theme} className={fontVariables} suppressHydrationWarning>
      {/* suppressHydrationWarning for the same reason as <html> and <body>:
          extensions write attributes onto <head> too, and this element now
          exists in our tree, so React compares it during hydration. */}
      <head suppressHydrationWarning>
        {/* Applies a saved light/dark choice before the first paint, so a dark
            theme never flashes white on the way in. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-dvh flex-col antialiased" suppressHydrationWarning>
        <ServiceWorker />
        {/* useSearchParams needs a Suspense boundary, or the whole tree opts
            out of static rendering. Nothing to show while it resolves. */}
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>

        {/*
          First in the tab order, invisible until focused.

          The header holds about seven controls - the wordmark, search, the map
          link, two languages, two theme buttons - and without this a keyboard
          or screen-reader user walks all of them again on every page before
          reaching anything they came for.
        */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-[var(--color-accent)] focus:px-5 focus:py-2.5 focus:text-sm focus:font-bold focus:text-[var(--color-on-accent)]"
        >
          {t(lang).skipToContent}
        </a>

        <Header locale={lang} />
        {/* tabIndex -1 so the link can move focus here, not just scroll. */}
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
          {children}
        </main>
        {/*
          The suggest link is the only way in for somewhere missing entirely:
          a place that is not listed has no page to report it from. It was a
          small coloured link between two lines of grey, which reads as fine
          print - a footer is where the eye stops looking, so the one thing in
          it worth doing gets a rule above it, a line saying who it is for,
          and the shape of something you can press.

          Two columns from sm: who this is (the brand and its line) on the
          left, and the one thing worth doing here on the right, in a soft
          card so it reads as an invitation rather than as fine print. Then a
          hairline and the attribution.

          pb-28 for the room underneath: the assistant button is fixed to the
          bottom-right, and on a page short enough that the footer sits in
          view it would otherwise sit on top of the suggest card. Only from lg
          is the page wide enough that the card ends well short of the button.
        */}
        {/* px-4 to match main: the footer is outside it, and without a gutter
            the attribution ran into both edges of a 320px screen. */}
        <footer className="mt-10 border-t border-[var(--color-line)] bg-[var(--color-surface)]/50 px-4 pb-28 pt-12 lg:pb-10">
          <div className="mx-auto flex max-w-5xl flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xs">
              <Link href={`/${lang}`} className="inline-flex items-center gap-2 text-lg font-bold tracking-tight">
                <Logo size={28} />
                {t(lang).siteName}
              </Link>
              <p className="mt-2 text-sm text-[var(--color-muted)]">{t(lang).tagline}</p>
            </div>

            <div className="flex flex-col items-start gap-3 rounded-[var(--brand-radius-lg)] bg-[var(--color-accent-soft)] p-5 sm:items-end sm:text-right">
              <p className="text-sm font-semibold text-[var(--color-ink)]">{t(lang).suggest.footerPrompt}</p>
              <Link href={`/${lang}/suggest`} className="btn btn-primary">
                <Glyph name="explore" size={17} />
                {t(lang).suggest.nav}
              </Link>
            </div>
          </div>

          <p className="mx-auto mt-10 max-w-5xl border-t border-[var(--color-line)] pt-6 text-xs text-[var(--color-muted)]">
            © {t(lang).siteName} · Map data © OpenStreetMap contributors
          </p>
        </footer>
        <Assistant locale={lang} timeZone={config.timeZone} />
      </body>
    </html>
  )
}
