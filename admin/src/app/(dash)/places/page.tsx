import Link from 'next/link'
import { listCategories, listPlaces } from '@/lib/api'
import { imageUrl } from '@/lib/image-url'
import { LOCALES } from '@/lib/form'
import { Rating } from '@/components/rating'
import { CardGrid, RecordCard } from '@/components/record-card'
import { Select } from '@/components/select'
import { Badge, Card, Empty, Input, PageHeader } from '@/components/ui'

export const dynamic = 'force-dynamic'

function SearchIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4.5"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

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
  const byId = new Map(categories.map((category) => [category.id, category]))
  const label = (category: (typeof categories)[number]) => category.name[primary] ?? category.slug
  const totalPages = Math.max(1, Math.ceil(places.meta.total / places.meta.limit))
  const filtered = Boolean(params.q || params.category)

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
          bookmarked and survives a reload after an edit. role="search" tells a
          screen reader what this group of controls is for. */}
      <form role="search" className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-48 flex-1">
          {/* The icon says "search" before the placeholder is read, and before
              anyone has to guess what the button on the right does. */}
          <span aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]">
            <SearchIcon />
          </span>
          <Input
            type="search"
            name="q"
            aria-label="Search places"
            placeholder="Search all languages…"
            defaultValue={params.q ?? ''}
            className="pl-10"
          />
        </div>

        <Select
          name="category"
          aria-label="Category"
          defaultValue={params.category ?? ''}
          placeholder="All categories"
          options={categories.map((category) => ({ value: String(category.id), label: label(category) }))}
          className="w-48 shrink-0"
        />

        <button
          type="submit"
          aria-label="Search"
          title="Search"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] transition hover:opacity-90"
        >
          <SearchIcon />
        </button>

        {/* Only when something is filtered: a permanently visible "clear" on an
            unfiltered list is a button that does nothing. A link, not a reset
            button, because the filters live in the URL. */}
        {filtered && (
          <Link
            href="/places"
            className="flex h-11 shrink-0 items-center rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-5 text-sm font-bold transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          >
            Clear
          </Link>
        )}
      </form>

      {places.data.length === 0 ? (
        <Card>
          <Empty>{params.q ? `Nothing matches “${params.q}”.` : 'No places yet.'}</Empty>
        </Card>
      ) : (
        <CardGrid>
          {places.data.map((place) => {
            const category = byId.get(place.category_id)
            // The first photo by sort order: the same one the public card and
            // the bot use, so the dashboard shows what visitors see.
            const cover = [...(place.images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0]
            return (
              <li key={place.id}>
                <RecordCard
                  href={`/places/${place.id}`}
                  icon={category?.icon}
                  imageUrl={imageUrl(cover?.storage_path)}
                  title={place.name[primary] ?? Object.values(place.name)[0] ?? place.slug}
                  detail={`${category ? label(category) : '—'} · ${place.slug}`}
                  badges={
                    <>
                      <Rating rating={place.rating} count={place.rating_count} />
                      {/* Missing translations are worth surfacing here: they are
                          invisible until someone browses in that language. */}
                      {LOCALES.filter((locale) => !place.name[locale]).map((locale) => (
                        <Badge key={locale} tone="warn">
                          no {locale}
                        </Badge>
                      ))}
                      {!place.is_active && <Badge tone="warn">hidden</Badge>}
                      {place.lat == null && <Badge>no map</Badge>}
                      {!cover && <Badge>no photo</Badge>}
                    </>
                  }
                />
              </li>
            )
          })}
        </CardGrid>
      )}

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
