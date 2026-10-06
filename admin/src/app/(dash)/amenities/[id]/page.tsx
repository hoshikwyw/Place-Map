import { notFound } from 'next/navigation'
import { listAmenities, listPlaces, type AmenityRow } from '@/lib/api'
import { LOCALES } from '@/lib/form'
import { AmenityForm } from './form'

export const dynamic = 'force-dynamic'

/**
 * One route for create and edit. `/amenities/new` is the same form with no
 * defaults, which keeps the two from drifting apart - a field added to one is
 * a field added to both.
 */
export default async function AmenityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  if (id === 'new') {
    return <AmenityForm locales={LOCALES} />
  }

  const numericId = Number(id)
  if (!Number.isInteger(numericId)) notFound()

  const amenities = await listAmenities()
  const amenity: AmenityRow | undefined = amenities.find((entry) => entry.id === numericId)
  if (!amenity) notFound()

  // Deleting is always allowed - nothing in the database refers to this row -
  // so the only safeguard is telling the operator what it costs first.
  const places = await listPlaces({ limit: 100 })
  const usedBy = places.data.filter((place) => (place.amenities ?? []).includes(amenity.slug)).length

  return <AmenityForm locales={LOCALES} amenity={amenity} usedBy={usedBy} />
}
