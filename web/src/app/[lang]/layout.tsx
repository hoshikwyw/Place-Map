import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Header } from '@/components/header'
import { config } from '@/lib/config'
import { nunito } from '@/lib/font'
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
    openGraph: { siteName: text.siteName, locale: lang, type: 'website' },
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

  return (
    <html lang={lang} className={nunito.variable}>
      <body className="flex min-h-dvh flex-col antialiased">
        <Header locale={lang} />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">{children}</main>
        <footer className="py-8 text-center text-xs text-[var(--color-muted)]">
          {t(lang).siteName} · Map data © OpenStreetMap contributors
        </footer>
      </body>
    </html>
  )
}
