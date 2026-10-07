import { PRICE_LEVELS } from '@place-map/shared'
import { Select } from './select'
import { Field, Input } from './ui'

/**
 * What a visit costs.
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
