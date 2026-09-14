import type { Metadata } from 'next'
import Link from 'next/link'
import { Mascot } from '@/components/mascot'
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
      <section className="mb-14 flex flex-col-reverse items-center gap-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full max-w-xl">
          <h1 className="mb-3 text-4xl font-extrabold tracking-tight sm:text-5xl">{text.siteName}</h1>
          <p className="mb-7 text-lg text-[var(--color-muted)]">{text.tagline}</p>
          <SearchForm locale={lang} />
        </div>
        {/* The only place the mascot moves: it is the page's welcome. */}
        <Mascot size={176} bob className="shrink-0" />
      </section>

      <h2 className="mb-5 text-xl font-extrabold">{text.categories}</h2>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {categories.map((category) => (
          <li key={category.id}>
            <Link
              href={`/${lang}/c/${category.slug}`}
              className="flex h-full flex-col items-start gap-3 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-4 transition hover:-translate-y-0.5 hover:border-[var(--color-accent)]"
            >
              <span
                aria-hidden
                className="flex size-12 items-center justify-center rounded-full bg-[var(--color-coral-soft)] text-2xl"
              >
                {category.icon ?? '📍'}
              </span>
              <span className="font-bold">{category.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
