import { notFound } from 'next/navigation'
import { listCategories, type CategoryRow } from '@/lib/api'
import { LOCALES } from '@/lib/form'
import { CategoryForm } from './form'

export const dynamic = 'force-dynamic'

/**
 * One route for create and edit. `/categories/new` is the same form with no
 * defaults, which keeps the two from drifting apart - a field added to one is a
 * field added to both.
 */
export default async function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  if (id === 'new') {
    return <CategoryForm locales={LOCALES} />
  }

  const numericId = Number(id)
  if (!Number.isInteger(numericId)) notFound()

  const categories = await listCategories()
  const category: CategoryRow | undefined = categories.find((entry) => entry.id === numericId)
  if (!category) notFound()

  return <CategoryForm locales={LOCALES} category={category} />
}
