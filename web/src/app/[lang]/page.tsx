import type { Metadata } from 'next'
import Link from 'next/link'
import { SearchForm } from '@/components/search-form'
import { getCategories } from '@/lib/api'
import { isLocale, t } from '@/lib/i18n'
import { requireLocale } from '@/lib/params'
import { alternates } from '@/lib/seo'

export const revalidate = 300

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>
}): Promise<Metadata> {
  const { lang } = await params
  return isLocale(lang) ? { alternates: alternates(lang, '') } : {}
}

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = requireLocale((await params).lang)
  const text = t(lang)
  const categories = await getCategories(lang)

  return (
    <>
      <section className="mb-10 max-w-2xl">
        <h1 className="mb-2 text-3xl font-semibold tracking-tight">{text.siteName}</h1>
        <p className="mb-6 text-[var(--color-muted)]">{text.tagline}</p>
        <SearchForm locale={lang} />
      </section>

      <h2 className="mb-4 text-lg font-semibold">{text.categories}</h2>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {categories.map((category) => (
          <li key={category.id}>
            <Link
              href={`/${lang}/c/${category.slug}`}
              className="flex h-full items-center gap-3 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-4 transition hover:border-[var(--color-accent)]"
            >
              <span className="text-2xl" aria-hidden>
                {category.icon ?? '📍'}
              </span>
              <span className="font-medium">{category.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
