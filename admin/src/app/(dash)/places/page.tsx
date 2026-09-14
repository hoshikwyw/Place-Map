import Link from 'next/link'
import { listCategories, listPlaces } from '@/lib/api'
import { LOCALES } from '@/lib/form'
import { Badge, Card, Empty, Input, PageHeader, Select } from '@/components/ui'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

export default async function PlacesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page ?? 1) || 1)
  const categoryId = params.category ? Number(params.category) : undefined

  const [categories, places] = await Promise.all([
    listCategories(),
    listPlaces({ categoryId, query: params.q, page, limit: PAGE_SIZE }),
  ])

  const primary = LOCALES[0] ?? 'en'
  const categoryName = new Map(categories.map((category) => [category.id, category.slug]))
  const totalPages = Math.max(1, Math.ceil(places.meta.total / places.meta.limit))

  return (
    <>
      <PageHeader
        title="Places"
        action={
          <Link
            href="/places/new"
            className="rounded-full bg-[var(--color-accent)] px-5 py-2 text-sm font-bold text-[var(--color-on-accent)] transition hover:opacity-90"
          >
            New place
          </Link>
        }
      />

      {/* A plain GET form: filters end up in the URL, so a filtered list can be
          bookmarked and survives a reload after an edit. */}
      <form className="mb-4 flex gap-2">
        <Input name="q" placeholder="Search all languages…" defaultValue={params.q ?? ''} />

        <Select name="category" defaultValue={params.category ?? ''} className="max-w-48">
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name[primary] ?? category.slug}
            </option>
          ))}
        </Select>

        <button
          type="submit"
          className="rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-5 py-2 text-sm font-bold transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
        >
          Filter
        </button>
      </form>

      <Card flush>
        {places.data.length === 0 ? (
          <Empty>{params.q ? `Nothing matches “${params.q}”.` : 'No places yet.'}</Empty>
        ) : (
          <ul className="divide-y divide-[var(--color-line)]">
            {places.data.map((place) => (
              <li key={place.id}>
                <Link
                  href={`/places/${place.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-canvas)]"
                >
                  <span className="flex-1">
                    <span className="block text-sm font-bold">
                      {place.name[primary] ?? Object.values(place.name)[0] ?? place.slug}
                    </span>
                    <span className="block text-xs text-[var(--color-muted)]">
                      {categoryName.get(place.category_id) ?? '—'} · {place.slug}
                    </span>
                  </span>

                  {LOCALES.filter((locale) => !place.name[locale]).map((locale) => (
                    <Badge key={locale} tone="warn">
                      no {locale}
                    </Badge>
                  ))}

                  {!place.is_active && <Badge tone="warn">hidden</Badge>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {totalPages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm">
          <PageLink params={params} page={page - 1} disabled={page <= 1}>
            « Previous
          </PageLink>
          <span className="text-[var(--color-muted)]">
            Page {page} of {totalPages} · {places.meta.total} places
          </span>
          <PageLink params={params} page={page + 1} disabled={page >= totalPages}>
            Next »
          </PageLink>
        </nav>
      )}
    </>
  )
}

function PageLink({
  params,
  page,
  disabled,
  children,
}: {
  params: { q?: string; category?: string }
  page: number
  disabled: boolean
  children: React.ReactNode
}) {
  if (disabled) return <span className="text-[var(--color-muted)] opacity-50">{children}</span>

  const search = new URLSearchParams()
  if (params.q) search.set('q', params.q)
  if (params.category) search.set('category', params.category)
  search.set('page', String(page))

  return (
    <Link href={`/places?${search}`} className="hover:underline">
      {children}
    </Link>
  )
}
