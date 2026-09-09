'use client'

import { useFormStatus } from 'react-dom'
import { WEEKDAYS } from '@place-map/shared'
import { Button, Field, Input, Textarea } from './ui'

/**
 * Disables itself while the action is in flight. Without it a slow write invites
 * a second click, and the second click creates a second row.
 */
export function SubmitButton({ children = 'Save' }: { children?: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Saving…' : children}
    </Button>
  )
}

export function DeleteButton({ label = 'Delete', confirm }: { label?: string; confirm: string }) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      variant="danger"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(confirm)) event.preventDefault()
      }}
    >
      {pending ? 'Deleting…' : label}
    </Button>
  )
}

/**
 * One input per locale, submitted as `name.en`, `name.uz`. Leaving a locale
 * blank omits it rather than storing an empty string - the API then falls back
 * to another language instead of rendering a blank name.
 */
export function LocalizedField({
  name,
  label,
  locales,
  values,
  multiline = false,
  required = false,
}: {
  name: string
  label: string
  locales: string[]
  values?: Record<string, string> | null
  multiline?: boolean
  required?: boolean
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-sm font-medium">{label}</legend>
      {locales.map((locale, index) => (
        <div key={locale} className="flex items-start gap-2">
          <span className="mt-2 w-8 shrink-0 text-xs uppercase text-[var(--color-muted)]">
            {locale}
          </span>
          {multiline ? (
            <Textarea name={`${name}.${locale}`} defaultValue={values?.[locale] ?? ''} />
          ) : (
            <Input
              name={`${name}.${locale}`}
              defaultValue={values?.[locale] ?? ''}
              // Only the first locale is enforced: requiring every translation
              // up front would block entry until someone fluent is available.
              required={required && index === 0}
            />
          )}
        </div>
      ))}
    </fieldset>
  )
}

/**
 * A text box per day. "09:00-18:00" is faster to type than four dropdowns, and
 * a split shift is just a comma. Blank means closed.
 */
export function OpeningHoursField({ values }: { values?: Record<string, string> }) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-sm font-medium">Opening hours</legend>
      <p className="text-xs text-[var(--color-muted)]">
        <code>09:00-18:00</code>, or <code>10:00-14:00, 16:00-22:00</code> for a split shift. Leave
        blank for closed.
      </p>
      {WEEKDAYS.map((day) => (
        <div key={day} className="flex items-center gap-2">
          <span className="w-8 shrink-0 text-xs uppercase text-[var(--color-muted)]">{day}</span>
          <Input name={`hours.${day}`} defaultValue={values?.[day] ?? ''} placeholder="closed" />
        </div>
      ))}
    </fieldset>
  )
}

/** Coordinates are entered together because the API rejects half a pair. */
export function CoordinateFields({ lat, lng }: { lat?: number | null; lng?: number | null }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Latitude" hint="Both or neither">
        <Input name="lat" type="number" step="any" defaultValue={lat ?? ''} />
      </Field>
      <Field label="Longitude" hint="41.3111, 69.2797">
        <Input name="lng" type="number" step="any" defaultValue={lng ?? ''} />
      </Field>
    </div>
  )
}
