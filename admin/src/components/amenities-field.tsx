'use client'

import Link from 'next/link'
import type { AmenityRow } from '@/lib/api'
import { Checkbox } from './ui'

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
