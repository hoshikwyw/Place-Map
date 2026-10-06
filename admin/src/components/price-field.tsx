import Link from 'next/link'
import { PRICE_LEVELS } from '@place-map/shared'
import type { AmenityRow } from '@/lib/api'
import { Select } from './select'
import { Checkbox, Field, Input } from './ui'

/**
 * Price and amenities.
 *
 * The level and the range are separate on purpose: every place can say roughly
 * how expensive it is, far fewer will keep an exact range up to date, and a
 * stale range is worse than none. Filling in only the level is the normal
 * case, not an incomplete one, so neither field is required and the hints say
 * so.
 */

const LEVEL_LABELS: Record<number, string> = {
  1: 'Inexpensive',
  2: 'Moderate',
  3: 'Expensive',
}

export function PriceField({
  level,
  min,
  max,
}: {
  level?: number | null
  min?: number | null
  max?: number | null
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-bold">Price</legend>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="How expensive" hint="Shown as a word on the place page">
          <Select
            name="price_level"
            defaultValue={level == null ? '' : String(level)}
            placeholder="Not stated"
            aria-label="How expensive"
            options={PRICE_LEVELS.map((value) => ({
              value: String(value),
              label: LEVEL_LABELS[value] ?? String(value),
            }))}
          />
        </Field>
        <Field label="From (Ks)" hint="Per person. Leave blank if it varies.">
          <Input name="price_min" type="number" min={0} step="100" defaultValue={min ?? ''} />
        </Field>
        <Field label="To (Ks)" hint="Leave blank for an open-ended range.">
          <Input name="price_max" type="number" min={0} step="100" defaultValue={max ?? ''} />
        </Field>
      </div>
    </fieldset>
  )
}

/**
 * The tick boxes come from the amenities table, so an amenity added in the
 * dashboard is offered here immediately and nothing has to be deployed.
 */
export function AmenitiesField({
  catalog,
  amenities = [],
  locale,
}: {
  catalog: AmenityRow[]
  amenities?: string[] | null
  locale: string
}) {
  const chosen = new Set(amenities ?? [])

  if (catalog.length === 0) {
    return (
      <fieldset>
        <legend className="mb-2 text-sm font-bold">What this place has</legend>
        <p className="text-sm text-[var(--color-muted)]">
          No amenities defined yet -{' '}
          <Link href="/amenities/new" className="text-[var(--color-accent)] hover:underline">
            add one
          </Link>
          .
        </p>
      </fieldset>
    )
  }

  // A slug this place carries that no longer matches a row. Kept as a ticked
  // box so saving the form does not quietly drop it, and labelled so the
  // operator can see why it shows nothing on the site.
  const orphans = [...chosen].filter((slug) => !catalog.some((a) => a.slug === slug))

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-bold">What this place has</legend>
      <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
        {catalog.map((amenity) => (
          // Every box submits under the same name, so the server reads them
          // as a list rather than reassembling indexed fields.
          <Checkbox
            key={amenity.id}
            name="amenities"
            value={amenity.slug}
            label={`${amenity.icon ? amenity.icon + ' ' : ''}${amenity.name[locale] ?? Object.values(amenity.name)[0] ?? amenity.slug}`}
            defaultChecked={chosen.has(amenity.slug)}
          />
        ))}
        {orphans.map((slug) => (
          <Checkbox key={slug} name="amenities" value={slug} label={`${slug} (no amenity)`} defaultChecked />
        ))}
      </div>
    </fieldset>
  )
}
