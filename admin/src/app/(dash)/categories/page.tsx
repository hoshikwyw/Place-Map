import Link from 'next/link'
import { listCategories } from '@/lib/api'
import { LOCALES } from '@/lib/form'
import { Badge, Card, Empty, PageHeader } from '@/components/ui'

export const dynamic = 'force-dynamic'

export default async function CategoriesPage() {
  const categories = await listCategories()
  const primary = LOCALES[0] ?? 'en'

  return (
    <>
      <PageHeader
        title="Categories"
        action={
          <Link
            href="/categories/new"
            className="rounded-md bg-[var(--color-accent)] px-3 py-2 text-sm font-medium text-white"
          >
            New category
          </Link>
        }
      />

      <Card className="p-0">
        {categories.length === 0 ? (
          <Empty>No categories yet. The bot shows nothing until one exists.</Empty>
        ) : (
          <ul className="divide-y divide-[var(--color-line)]">
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  href={`/categories/${category.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-canvas)]"
                >
                  <span className="w-6 text-center">{category.icon ?? '·'}</span>

                  <span className="flex-1">
                    <span className="block text-sm font-medium">
                      {category.name[primary] ?? Object.values(category.name)[0] ?? category.slug}
                    </span>
                    <span className="block text-xs text-[var(--color-muted)]">{category.slug}</span>
                  </span>

                  {/* Missing translations are worth surfacing in the list: they
                      are invisible until someone browses in that language. */}
                  {LOCALES.filter((locale) => !category.name[locale]).map((locale) => (
                    <Badge key={locale} tone="warn">
                      no {locale}
                    </Badge>
                  ))}

                  {!category.is_active && <Badge tone="warn">hidden</Badge>}

                  <span className="text-xs text-[var(--color-muted)]">#{category.sort_order}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
