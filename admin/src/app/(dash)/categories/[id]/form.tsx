'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { createCategory, deleteCategory, updateCategory } from '@/actions/categories'
import type { CategoryRow } from '@/lib/api'
import { DeleteButton, LocalizedField, SubmitButton } from '@/components/form-parts'
import { CategoryIconUpload } from './icon-upload'
import { Card, Checkbox, ErrorBanner, Field, Input, PageHeader } from '@/components/ui'

export function CategoryForm({
  locales,
  category,
  imagekitEndpoint,
}: {
  locales: string[]
  category?: CategoryRow
  /** Null until ImageKit is configured - icon upload is then switched off. */
  imagekitEndpoint?: string | null
}) {
  const editing = category !== undefined

  const [state, action] = useActionState(
    editing ? updateCategory.bind(null, category.id) : createCategory,
    {},
  )

  return (
    <>
      <PageHeader
        title={editing ? 'Edit category' : 'New category'}
        action={
          <Link href="/categories" className="text-sm text-[var(--color-muted)] hover:underline">
            Back
          </Link>
        }
      />

      <Card>
        <form action={action} className="space-y-5">
          <LocalizedField
            name="name"
            label="Name"
            locales={locales}
            values={category?.name}
            required
          />

          <Field label="Slug" hint="Lowercase with hyphens. Appears in public URLs.">
            <Input name="slug" defaultValue={category?.slug ?? ''} required pattern="[a-z0-9-]+" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Emoji" hint="Used on the bot's buttons, and wherever no image is set">
              <Input name="icon" defaultValue={category?.icon ?? ''} maxLength={4} />
            </Field>
            <Field label="Sort order" hint="Lower comes first">
              <Input name="sort_order" type="number" defaultValue={category?.sort_order ?? 0} />
            </Field>
          </div>

          {/* Saving the form must not drop an image uploaded below it. */}
          <input type="hidden" name="icon_image" value={category?.icon_image ?? ''} />

          <Checkbox
            name="is_active"
            label="Visible to the public"
            defaultChecked={category?.is_active ?? true}
          />

          <ErrorBanner message={state.error} />

          <div className="flex items-center gap-3">
            <SubmitButton>{editing ? 'Save' : 'Create'}</SubmitButton>
          </div>
        </form>
      </Card>

      {editing && (
        <Card className="mt-5">
          <CategoryIconUpload
            id={category.id}
            slug={category.slug}
            icon={category.icon}
            iconImage={category.icon_image}
            endpoint={imagekitEndpoint ?? null}
          />
        </Card>
      )}

      {editing && (
        <Card className="mt-5">
          <h2 className="mb-1 text-sm font-bold">Delete this category</h2>
          <p className="mb-3 text-sm text-[var(--color-muted)]">
            Refused while it still holds places - move them first. Hiding it instead keeps the data
            and takes it off the bot immediately.
          </p>

          {/* A separate form: a delete button inside the edit form would submit
              the edit action, and browsers give the first submit button the
              Enter key. */}
          <form action={deleteCategory.bind(null, category.id)}>
            <DeleteButton confirm={`Delete "${category.slug}"? This cannot be undone.`} />
          </form>
        </Card>
      )}
    </>
  )
}
