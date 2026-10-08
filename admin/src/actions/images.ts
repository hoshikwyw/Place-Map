'use server'

import { revalidatePath } from 'next/cache'
import * as api from '@/lib/api'
import { requireSession } from '@/lib/auth'
import { env } from '@/lib/env'
import { PHOTO, checkFile, encode, uploadToImageKit } from '@/lib/imagekit'
import type { ActionState } from './auth'

/**
 * Place photos. The resizing and the ImageKit call live in lib/imagekit.ts,
 * shared with the category icon uploader, so neither can drift into uploading
 * something the other would have shrunk.
 */

export async function uploadImage(
  placeId: number,
  placeSlug: string,
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireSession()

  // The page hides the form when ImageKit is unset, but an action is its own
  // POST endpoint and must refuse on its own.
  const imagekit = env.imagekit
  if (!imagekit) {
    return { error: 'Photo upload is not configured - set IMAGEKIT_URL_ENDPOINT and IMAGEKIT_PRIVATE_KEY.' }
  }

  const checked = checkFile(form.get('file'))
  if ('error' in checked) return { error: checked.error }

  try {
    const encoded = await encode(Buffer.from(await checked.file.arrayBuffer()), PHOTO)

    // Unique names here, unlike the CLI's deterministic ones: uploads through
    // the dashboard arrive one at a time in no fixed order, so a position-based
    // name would overwrite whatever already sat in that slot.
    const path = await uploadToImageKit(
      imagekit.privateKey,
      encoded.buffer,
      `${placeSlug}-${Date.now()}.webp`,
      `/places/${placeSlug}`,
    )

    // One past the last photo, so a new one lands at the end.
    //
    // This used to be `Date.now() % 100000`, reaching for something that only
    // grows - but the column is a 32-bit int, so the clock had to be wrapped
    // to fit, and a wrapped clock does not grow. The cycle is 100 seconds,
    // which made a new photo sort *before* the existing ones a good fraction
    // of the time: it silently became the cover on the website and the photo
    // the bot sends.
    const existing = await api.listImages(placeId)
    const sortOrder = existing.reduce((max, image) => Math.max(max, image.sort_order), 0) + 1

    await api.addImage(placeId, {
      storage_path: path,
      width: encoded.width,
      height: encoded.height,
      sort_order: sortOrder,
    })
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Upload failed' }
  }

  revalidatePath(`/places/${placeId}`)
  return {}
}

export async function removeImage(placeId: number, imageId: number): Promise<void> {
  await requireSession()

  // Only the row goes. The file stays on ImageKit so an accidental delete is
  // recoverable; clearing orphans is a separate, deliberate job.
  await api.deleteImage(imageId)
  revalidatePath(`/places/${placeId}`)
}

export async function moveImage(
  placeId: number,
  imageId: number,
  direction: 'up' | 'down',
): Promise<void> {
  await requireSession()

  const images = await api.listImages(placeId)
  const order = images.map((image) => image.id)
  const index = order.indexOf(imageId)
  const target = direction === 'up' ? index - 1 : index + 1

  if (index === -1 || target < 0 || target >= order.length) return

  ;[order[index], order[target]] = [order[target]!, order[index]!]

  await api.reorderImages(placeId, order)
  revalidatePath(`/places/${placeId}`)
}
