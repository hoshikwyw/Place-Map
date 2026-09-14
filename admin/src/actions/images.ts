'use server'

import { revalidatePath } from 'next/cache'
import sharp from 'sharp'
import * as api from '@/lib/api'
import { requireSession } from '@/lib/auth'
import { env } from '@/lib/env'
import type { ActionState } from './auth'

/**
 * Upload runs here, not in the Worker.
 *
 * Resizing a photo costs hundreds of milliseconds and a Worker gets 10 ms of
 * CPU. More to the point, it keeps `IMAGEKIT_PRIVATE_KEY` on this server: the
 * browser sends the original file to this action, and only a path ever reaches
 * the API.
 *
 * Same gate as the CLI in Part 3 - 1200px WebP under 200 KB - because image
 * size is the free-tier limit that actually bites, and a second upload route
 * that skipped it would quietly undo the first.
 */

const MAX_WIDTH = 1200
const TARGET_BYTES = 200 * 1024
const QUALITY_STEPS = [82, 75, 68, 60, 52, 45]
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024

async function encode(source: Buffer) {
  let last
  for (const quality of QUALITY_STEPS) {
    const { data, info } = await sharp(source)
      .rotate() // applies EXIF orientation, or phone photos land sideways
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality })
      .toBuffer({ resolveWithObject: true })

    last = { buffer: data, width: info.width, height: info.height }
    if (data.byteLength <= TARGET_BYTES) break
  }
  return last!
}

async function uploadToImageKit(
  privateKey: string,
  buffer: Buffer,
  fileName: string,
  folder: string,
) {
  const form = new FormData()
  form.append('file', new Blob([new Uint8Array(buffer)], { type: 'image/webp' }), fileName)
  form.append('fileName', fileName)
  form.append('folder', folder)
  form.append('useUniqueFileName', 'true')

  const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${privateKey}:`).toString('base64')}`,
    },
    body: form,
  })

  const body = (await response.json()) as { filePath?: string; message?: string }
  if (!response.ok || !body.filePath) {
    throw new Error(body.message ?? 'Upload to ImageKit failed')
  }
  return body.filePath
}

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

  const file = form.get('file')
  if (!(file instanceof File) || file.size === 0) return { error: 'Choose an image first' }
  if (file.size > MAX_UPLOAD_BYTES) return { error: 'That file is over 25 MB' }
  if (!file.type.startsWith('image/')) return { error: 'That is not an image' }

  try {
    const encoded = await encode(Buffer.from(await file.arrayBuffer()))

    // Unique names here, unlike the CLI's deterministic ones: uploads through
    // the dashboard arrive one at a time in no fixed order, so a position-based
    // name would overwrite whatever already sat in that slot.
    const path = await uploadToImageKit(
      imagekit.privateKey,
      encoded.buffer,
      `${placeSlug}-${Date.now()}.webp`,
      `/places/${placeSlug}`,
    )

    await api.addImage(placeId, {
      storage_path: path,
      width: encoded.width,
      height: encoded.height,
      sort_order: Date.now() % 100000, // pushed to the end; reorder fixes it
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
