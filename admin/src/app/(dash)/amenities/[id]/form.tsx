'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { createAmenity, deleteAmenity, updateAmenity } from '@/actions/amenities'
import type { AmenityRow } from '@/lib/api'
import { DeleteButton, LocalizedField, SubmitButton } from '@/components/form-parts'
import { AmenityIconUpload } from './icon-upload'
import { Card, Checkbox, ErrorBanner, Field, Input, PageHeader } from '@/components/ui'

export function AmenityForm({
  locales,
  amenity,
  usedBy = 0,
  imagekitEndpoint,
}: {
  locales: string[]
  amenity?: AmenityRow
  /** How many places carry this slug, so deleting states its cost. */
  usedBy?: number
  /** Null until ImageKit is configured - icon upload is then switched off. */
  imagekitEndpoint?: string | null
}) {
  const editing = amenity !== undefined

  const [state, action] = useActionState(
    editing ? updateAmenity.bind(null, amenity.id) : createAmenity,
    {},
  )

  const places = usedBy === 1 ? '1 place' : `${usedBy} places`

  return (
    <>
      <PageHeader
        title={editing ? 'Edit amenity' : 'New amenity'}
        action={
          <Link href="/amenities" className="text-sm text-[var(--color-muted)] hover:underline">
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
            values={amenity?.name}
            required
          />

          <Field
            label="Slug"
            hint={
              editing
                ? `Stored on each place as text. Changing it removes this chip from ${places}.`
                : 'Lowercase with underscores. Stored on each place as text.'
            }
          >
            <Input
              name="slug"
              defaultValue={amenity?.slug ?? ''}
              required
              pattern="[a-z0-9]+(_[a-z0-9]+)*"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Emoji" hint="Shown where the site has no drawn icon for this slug">
              <Input name="icon" defaultValue={amenity?.icon ?? ''} maxLength={4} />
            </Field>
            <Field label="Sort order" hint="Lower comes first">
              <Input name="sort_order" type="number" defaultValue={amenity?.sort_order ?? 0} />
            </Field>
          </div>

          {/* Saving the form must not drop an image uploaded below it. */}
          <input type="hidden" name="icon_image" value={amenity?.icon_image ?? ''} />

          <Checkbox
            name="is_active"
            label="Offered on places and shown on the site"
            defaultChecked={amenity?.is_active ?? true}
          />

          {!editing && (
            <p className="text-sm text-[var(--color-muted)]">
              An icon image can be uploaded on the next screen, once this amenity exists.
            </p>
          )}

          <ErrorBanner message={state.error} />

          <div className="flex items-center gap-3">
            <SubmitButton>{editing ? 'Save' : 'Create'}</SubmitButton>
          </div>
        </form>
      </Card>

      {editing && (
        <Card className="mt-5">
          <AmenityIconUpload
            id={amenity.id}
            slug={amenity.slug}
            icon={amenity.icon}
            iconImage={amenity.icon_image}
            endpoint={imagekitEndpoint ?? null}
          />
        </Card>
      )}

      {editing && (
        <Card className="mt-5">
          <h2 className="mb-1 text-sm font-bold">Delete this amenity</h2>
          <p className="mb-3 text-sm text-[var(--color-muted)]">
            {usedBy === 0
              ? 'No place uses this one, so nothing on the site changes.'
              : `${places} carry this slug. They keep it, but it stops resolving, so each shows one chip fewer. Unticking "offered" instead keeps the data and takes it off the site immediately.`}
          </p>

          {/* A separate form: a delete button inside the edit form would submit
              the edit action, and browsers give the first submit button the
              Enter key. */}
          <form action={deleteAmenity.bind(null, amenity.id)}>
            <DeleteButton
              confirm={
                usedBy === 0
                  ? `Delete "${amenity.slug}"? This cannot be undone.`
                  : `Delete "${amenity.slug}"? ${places} will stop showing it. This cannot be undone.`
              }
            />
          </form>
        </Card>
      )}
    </>
  )
}
