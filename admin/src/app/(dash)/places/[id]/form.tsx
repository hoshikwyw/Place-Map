'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { WEEKDAYS } from '@place-map/shared'
import { createPlace, deletePlace, updatePlace } from '@/actions/places'
import type { CategoryRow, PlaceRow } from '@/lib/api'
import {
  CoordinateFields,
  DeleteButton,
  LocalizedField,
  OpeningHoursField,
  SubmitButton,
} from '@/components/form-parts'
import { Card, Checkbox, ErrorBanner, Field, Input, PageHeader, Select } from '@/components/ui'

/** Turns stored ranges back into the text the hours boxes accept. */
function hoursToFields(place?: PlaceRow): Record<string, string> {
  const result: Record<string, string> = {}
  for (const day of WEEKDAYS) {
    const ranges = place?.opening_hours?.[day]
    result[day] = ranges?.length ? ranges.map(([o, c]) => `${o}-${c}`).join(', ') : ''
  }
  return result
}

export function PlaceForm({
  locales,
  categories,
  place,
}: {
  locales: string[]
  categories: CategoryRow[]
  place?: PlaceRow
}) {
  const editing = place !== undefined
  const primary = locales[0] ?? 'en'

  const [state, action] = useActionState(
    editing ? updatePlace.bind(null, place.id) : createPlace,
    {},
  )

  return (
    <>
      <PageHeader
        title={editing ? (place.name[primary] ?? place.slug) : 'New place'}
        action={
          <Link href="/places" className="text-sm text-[var(--color-muted)] hover:underline">
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
            values={place?.name}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <Select name="category_id" defaultValue={place?.category_id ?? ''} required>
                <option value="" disabled>
                  Choose…
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name[primary] ?? category.slug}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Slug" hint="Lowercase with hyphens">
              <Input name="slug" defaultValue={place?.slug ?? ''} required pattern="[a-z0-9-]+" />
            </Field>
          </div>

          <LocalizedField
            name="description"
            label="Description"
            locales={locales}
            values={place?.description}
            multiline
          />

          <Field label="Address">
            <Input name="address" defaultValue={place?.address ?? ''} />
          </Field>

          <CoordinateFields lat={place?.lat} lng={place?.lng} />

          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone">
              <Input name="phone" defaultValue={place?.phone ?? ''} placeholder="+998901234567" />
            </Field>
            <Field label="Website">
              <Input
                name="website"
                type="url"
                defaultValue={place?.website ?? ''}
                placeholder="https://…"
              />
            </Field>
          </div>

          <OpeningHoursField values={hoursToFields(place)} />

          <div className="flex items-end gap-6">
            <Field label="Sort order" hint="Lower comes first">
              <Input name="sort_order" type="number" defaultValue={place?.sort_order ?? 0} />
            </Field>
            <Checkbox
              name="is_active"
              label="Visible to the public"
              defaultChecked={place?.is_active ?? true}
            />
          </div>

          <ErrorBanner message={state.error} />

          <SubmitButton>{editing ? 'Save' : 'Create'}</SubmitButton>
        </form>
      </Card>

      {editing && (
        <Card className="mt-5">
          <h2 className="mb-1 text-sm font-medium">Delete this place</h2>
          <p className="mb-3 text-sm text-[var(--color-muted)]">
            Removes the place and its image records. The image files stay on the CDN. Unchecking
            &ldquo;visible&rdquo; hides it from the bot and the site without losing anything.
          </p>
          <form action={deletePlace.bind(null, place.id)}>
            <DeleteButton confirm={`Delete "${place.slug}"? This cannot be undone.`} />
          </form>
        </Card>
      )}
    </>
  )
}
