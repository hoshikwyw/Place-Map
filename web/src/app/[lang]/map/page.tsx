import type { Metadata } from 'next'
import { MapExplorer } from '@/components/map-explorer'
import { getAllPlaces, getCategories } from '@/lib/api'
import { isLocale, t } from '@/lib/i18n'
import { requireLocale } from '@/lib/params'
import { alternates } from '@/lib/seo'
import { EmptyState } from '@/components/feedback'
import { PageHeader } from '@/components/page-header'

export const revalidate = 300

type Params = Promise<{ lang: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  const text = t(lang)
  return { title: text.map, description: text.mapIntro, alternates: alternates(lang, '/map') }
}

/**
 * Every place on one map.
 *
 * The whole list is fetched here, on the server, and cached for five minutes
 * like the rest of the site: a map that asked the API for pins as the visitor
 * panned would spend the Worker's daily request budget on scrolling.
 */
export default async function MapPage({ params }: { params: Params }) {
  const lang = requireLocale((await params).lang)
  const text = t(lang)

  const [categories, places] = await Promise.all([getCategories(lang), getAllPlaces(lang)])

  // A place with no coordinates cannot be a pin. They are still reachable
  // everywhere else on the site.
  const mappable = places.filter((place) => place.location !== null)
  const categoriesShown = categories.filter((category) =>
    mappable.some((place) => place.category.slug === category.slug),
  )

  return (
    <>
      <PageHeader title={text.map} intro={text.mapIntro} className="mb-6" />

      {mappable.length === 0 ? (
        <EmptyState>{text.mapEmpty}</EmptyState>
      ) : (
        <MapExplorer places={mappable} categories={categoriesShown} locale={lang} />
      )}
    </>
  )
}
