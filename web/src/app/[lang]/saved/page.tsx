import type { Metadata } from 'next'
import { SavedList } from '@/components/saved-list'
import { config } from '@/lib/config'
import { isLocale, t } from '@/lib/i18n'
import { requireLocale } from '@/lib/params'

type Params = Promise<{ lang: string }>

/**
 * The saved places.
 *
 * Nothing here can be rendered on the server - the list is on the reader's
 * device - so the page is a shell around a client component. It is also kept
 * out of the sitemap and told not to index: a page whose content differs for
 * every visitor and is empty for a crawler is not a page to list.
 */
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}

  return {
    title: t(lang).savedTitle,
    robots: { index: false, follow: true },
  }
}

export default async function SavedPage({ params }: { params: Params }) {
  const lang = requireLocale((await params).lang)
  const text = t(lang)

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold">{text.savedTitle}</h1>
      <p className="mb-6 text-sm text-[var(--color-muted)]">{text.savedIntro}</p>

      <SavedList locale={lang} timeZone={config.timeZone} />
    </>
  )
}
