import Link from 'next/link'
import { listCategories } from '@/lib/api'
import { LOCALES } from '@/lib/form'
import { CardGrid, RecordCard } from '@/components/record-card'
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
            className="rounded-full bg-[var(--color-accent)] px-5 py-2 text-sm font-bold text-[var(--color-on-accent)] transition hover:opacity-90"
          >
            New category
          </Link>
        }
      />

      {categories.length === 0 ? (
        <Card>
          <Empty>No categories yet. The bot shows nothing until one exists.</Empty>
        </Card>
      ) : (
        <CardGrid>
          {categories.map((category) => (
            <li key={category.id}>
              <RecordCard
                href={`/categories/${category.id}`}
                icon={category.icon}
                title={category.name[primary] ?? Object.values(category.name)[0] ?? category.slug}
                detail={category.slug}
                trailing={`#${category.sort_order}`}
                badges={
                  <>
                    {/* Missing translations are worth surfacing in the list: they
                        are invisible until someone browses in that language. */}
                    {LOCALES.filter((locale) => !category.name[locale]).map((locale) => (
                      <Badge key={locale} tone="warn">
                        no {locale}
                      </Badge>
                    ))}
                    {!category.is_active && <Badge tone="warn">hidden</Badge>}
                  </>
                }
              />
            </li>
          ))}
        </CardGrid>
      )}
    </>
  )
}
