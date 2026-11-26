'use client'

import { useActionState, type ReactNode } from 'react'
import { createPlace, deletePlace, updatePlace } from '@/actions/places'
import type { AmenityRow, CategoryRow, PlaceRow } from '@/lib/api'
import { CoordinateFields, DeleteButton, LocalizedField, SubmitButton } from '@/components/form-parts'
import { OpeningHoursField } from '@/components/hours-field'
import { LinksField } from '@/components/links-field'
import { AmenitiesField } from '@/components/amenities-field'
import { PriceField } from '@/components/price-field'
import { Select } from '@/components/select'
import { BackLink, Card, Checkbox, ErrorBanner, Field, FormSection, Input, PageHeader } from '@/components/ui'

export function PlaceForm({
  locales,
  categories,
  amenities,
  place,
  media,
}: {
  locales: string[]
  categories: CategoryRow[]
  /** The amenity catalog the tick boxes are built from. */
  amenities: AmenityRow[]
  place?: PlaceRow
  /**
   * The photos, passed in by the page so they render above the delete card:
   * the destructive action comes last on the page, after everything that is
   * merely edited. It used to sit between the form and the photos.
   */
  media?: ReactNode
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
        action={<BackLink href="/places">All places</BackLink>}
      />

      {/* A plain surface, not <Card>: Card clips its overflow, and a clipped
          box stops the save bar below from sticking to the screen. */}
      <div className="surface">
        <form action={action} className="space-y-6 p-6">
          <FormSection title="Basics">
            <LocalizedField
              name="name"
              label="Name"
              locales={locales}
              values={place?.name}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Field label="Category">
                <Select
                  name="category_id"
                  aria-label="Category"
                  defaultValue={place?.category_id ? String(place.category_id) : ''}
                  placeholder="Choose…"
                  options={categories.map((category) => ({
                    value: String(category.id),
                    label: category.name[primary] ?? category.slug,
                  }))}
                />
              </Field>

              <Field label="Slug" hint="Lowercase with hyphens">
                <Input name="slug" defaultValue={place?.slug ?? ''} required pattern="[a-z0-9]+(-[a-z0-9]+)*" />
              </Field>
            </div>

            <LocalizedField
              name="description"
              label="Description"
              locales={locales}
              values={place?.description}
              multiline
            />
          </FormSection>

          <FormSection title="Location" hint="Paste a map link to fill the coordinates.">
            <Field label="Address">
              <Input name="address" defaultValue={place?.address ?? ''} />
            </Field>

            <CoordinateFields lat={place?.lat} lng={place?.lng} />
          </FormSection>

          <FormSection title="Contact">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone">
                <Input name="phone" defaultValue={place?.phone ?? ''} placeholder="+959123456789" />
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

            <LinksField links={place?.links} />
          </FormSection>

          <FormSection title="Price and rating">
            <PriceField
              level={place?.price_level}
              min={place?.price_min}
              max={place?.price_max}
            />

            <div className="grid grid-cols-2 gap-3">
              <Field label="Rating" hint="0-5, one decimal. Blank means unrated.">
                <Input name="rating" type="number" min={0} max={5} step="0.1" defaultValue={place?.rating ?? ''} />
              </Field>
              <Field label="Ratings counted" hint="Shown beside the rating, as (128)">
                <Input name="rating_count" type="number" min={0} step="1" defaultValue={place?.rating_count ?? 0} />
              </Field>
            </div>
          </FormSection>

          <FormSection title="Amenities and hours">
            <AmenitiesField catalog={amenities} amenities={place?.amenities} locale={locales[0] ?? 'en'} />

            <OpeningHoursField hours={place?.opening_hours} />
          </FormSection>

          <FormSection title="Visibility">
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
          </FormSection>

          {/*
            Pinned to the bottom of the screen while the form is in view: the
            form is some 2,700px tall, and Save sat at the very end of it, so
            fixing a typo in the name meant scrolling the whole page to save
            it. The error shows here too, beside the button that caused it.
          */}
          <div className="sticky bottom-0 z-10 -mx-6 -mb-6 flex flex-wrap items-center justify-end gap-3 rounded-b-[var(--brand-radius-lg)] border-t border-[var(--color-line)] bg-[var(--color-surface)]/90 px-6 py-4 backdrop-blur-md">
            <div className="mr-auto min-w-0">
              <ErrorBanner message={state.error} />
            </div>
            <SubmitButton>{editing ? 'Save' : 'Create'}</SubmitButton>
          </div>
        </form>
      </div>

      {media}

      {editing && (
        // The danger zone: last on the page, and tinted so it reads as one.
        <Card className="mt-5 border-[var(--color-danger)]/30">
          <h2 className="mb-1 text-base font-bold text-[var(--color-danger)]">Delete this place</h2>
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
