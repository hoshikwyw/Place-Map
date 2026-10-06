import { AMENITIES, PRICE_LEVELS, type Amenity } from '@place-map/shared'
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

export const AMENITY_LABELS: Record<Amenity, string> = {
  wifi: 'Wi-Fi',
  parking: 'Parking',
  outdoor_seating: 'Outdoor seating',
  air_conditioning: 'Air conditioning',
  delivery: 'Delivery',
  takeaway: 'Takeaway',
  card_payment: 'Card accepted',
  family_friendly: 'Family friendly',
  wheelchair_accessible: 'Wheelchair accessible',
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

export function AmenitiesField({ amenities = [] }: { amenities?: Amenity[] | null }) {
  const chosen = new Set(amenities ?? [])

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-bold">What this place has</legend>
      <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
        {AMENITIES.map((amenity) => (
          // Every box submits under the same name, so the server reads them
          // as a list rather than reassembling indexed fields.
          <Checkbox
            key={amenity}
            name="amenities"
            value={amenity}
            label={AMENITY_LABELS[amenity]}
            defaultChecked={chosen.has(amenity)}
          />
        ))}
      </div>
    </fieldset>
  )
}
