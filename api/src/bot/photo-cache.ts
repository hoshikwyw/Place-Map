import { db } from '../db.js'
import type { Env } from '../types.js'

/**
 * The `file_id` trick, and the one place the bot touches the database directly.
 *
 * When Telegram accepts a photo it returns a `file_id`. Every later send can
 * pass that id instead of a URL, and Telegram serves the image from their own
 * CDN - your ImageKit bandwidth is untouched from the second send onward.
 *
 * Filling it is lazy: send the ImageKit URL once, read the `file_id` off the
 * response, write it back. This is deliberately not exposed through `/v1` -
 * a `file_id` is meaningless to the web and native apps, and putting it in the
 * public place object would leak a Telegram implementation detail to every
 * client.
 */

export interface CachedPhoto {
  imageId: number
  /** Pass straight to sendPhoto when present - this send costs nothing. */
  fileId: string | null
  /** Fallback for the first send only. */
  url: string
}

export async function firstPhoto(env: Env, placeId: number): Promise<CachedPhoto | null> {
  const { data, error } = await db(env)
    .from('place_images')
    .select('id, storage_path, telegram_file_id')
    .eq('place_id', placeId)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('photo lookup failed', error.message)
    return null
  }
  if (!data) return null

  const base = env.IMAGEKIT_URL_ENDPOINT.replace(/\/+$/, '')
  const path = String(data.storage_path).replace(/^\/+/, '')

  return {
    imageId: data.id as number,
    fileId: (data.telegram_file_id as string | null) ?? null,
    url: `${base}/${path}`,
  }
}

/** Best-effort: a failed write only means the next send pays for bandwidth again. */
export async function rememberFileId(env: Env, imageId: number, fileId: string): Promise<void> {
  const { error } = await db(env)
    .from('place_images')
    .update({ telegram_file_id: fileId })
    .eq('id', imageId)

  if (error) console.error('caching file_id failed', error.message)
}
