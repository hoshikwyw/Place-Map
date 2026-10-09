import type { Metadata } from 'next'
import Link from 'next/link'
import { SuggestForm } from '@/components/suggest-form'
import { NotFoundError, getPlace } from '@/lib/api'
import { isLocale, t, type Locale } from '@/lib/i18n'
import { requireLocale } from '@/lib/params'
import { alternates } from '@/lib/seo'

export const revalidate = 300

type Params = Promise<{ lang: string }>
type Query = Promise<{ about?: string }>

/**
 * Two pages in one: suggest somewhere missing, or report something wrong with
 * a place that is listed. `?about=<slug>` switches it.
 *
 * The slug is resolved against the API rather than the name being carried in
 * the URL. A name in a query string can say anything, and this page would then
 * repeat it back - "Something wrong with <whatever somebody typed>?" over our
 * own layout. Looking it up means the page can only ever name a real place.
 */
async function subject(lang: Locale, slug: string | undefined) {
  if (!slug) return undefined
  try {
    const place = await getPlace(lang, slug)
    return { id: place.id, name: place.name }
  } catch (error) {
    // A deleted place, or a made-up slug: fall back to the plain form rather
    // than a 404. Somebody who came here to say something should still be able
    // to say it.
    if (error instanceof NotFoundError) return undefined
    throw error
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  const text = t(lang)

  return {
    title: text.suggest.title,
    description: text.suggest.intro,
    alternates: alternates(lang, '/suggest'),
  }
}

export default async function SuggestPage({
  params,
  searchParams,
}: {
  params: Params
  searchParams: Query
}) {
  const { lang: rawLang } = await params
  const lang = requireLocale(rawLang)
  const text = t(lang)

  const { about } = await searchParams
  const place = await subject(lang, about)

  return (
    <div className="mx-auto max-w-xl">
      {place && (
        <nav className="mb-4">
          <Link
            href={`/${lang}/p/${about}`}
            className="text-sm font-bold text-[var(--color-accent)] hover:underline"
          >
            ← {place.name}
          </Link>
        </nav>
      )}

      <h1 className="text-3xl font-bold tracking-tight">
        {place ? text.suggest.reportTitle : text.suggest.title}
      </h1>
      <p className="mt-2 mb-6 text-[var(--color-muted)]">
        {place ? text.suggest.reportIntro(place.name) : text.suggest.intro}
      </p>

      <SuggestForm locale={lang} place={place} />
    </div>
  )
}
