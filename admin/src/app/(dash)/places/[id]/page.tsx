import { notFound } from 'next/navigation'
import { getPlace, listCategories, listImages, ApiError } from '@/lib/api'
import { env } from '@/lib/env'
import { LOCALES } from '@/lib/form'
import { PlaceForm } from './form'
import { ImageManager } from './images'

export const dynamic = 'force-dynamic'

export default async function PlacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const categories = await listCategories()

  if (id === 'new') {
    return <PlaceForm locales={LOCALES} categories={categories} />
  }

  const numericId = Number(id)
  if (!Number.isInteger(numericId)) notFound()

  let place
  try {
    place = await getPlace(numericId)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound()
    throw error
  }

  // Images are only meaningful once the place exists, so this half of the
  // screen appears on edit and not on create.
  const images = await listImages(numericId)

  return (
    <>
      <PlaceForm locales={LOCALES} categories={categories} place={place} />
      {/* The CDN base is a server-only env value, so it is handed down as a
          prop rather than read inside the client component. */}
      <ImageManager
        placeId={place.id}
        placeSlug={place.slug}
        images={images}
        endpoint={env.imagekitEndpoint}
      />
    </>
  )
}
