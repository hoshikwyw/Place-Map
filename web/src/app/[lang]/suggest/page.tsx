import type { Metadata } from 'next'
import Link from 'next/link'
import { SuggestForm } from '@/components/suggest-form'
import { NotFoundError, getPlace } from '@/lib/api'
import { isLocale, t, type Locale } from '@/lib/i18n'
import { requireLocale } from '@/lib/params'
import { alternates } from '@/lib/seo'
import { PageHeader } from '@/components/page-header'

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
        <nav className="mb-5">
          {/* Back to the place being corrected - a ghost button with a
              chevron, the same shape as the place page's breadcrumb. */}
          <Link href={`/${lang}/p/${about}`} className="btn btn-ghost min-h-9 gap-1 px-2 pointer-coarse:min-h-11">
            <svg aria-hidden viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <path d="m15 6-6 6 6 6" />
            </svg>
            {place.name}
          </Link>
        </nav>
      )}

      <PageHeader
        title={place ? text.suggest.reportTitle : text.suggest.title}
        intro={place ? text.suggest.reportIntro(place.name) : text.suggest.intro}
        className="mb-6"
      />

      <SuggestForm locale={lang} place={place} />
    </div>
  )
}
