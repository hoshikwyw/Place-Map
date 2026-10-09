import 'server-only'
import sharp from 'sharp'

/**
 * Image handling for both uploaders - place photos and category icons.
 *
 * It runs here, not in the Worker: resizing costs hundreds of milliseconds and
 * a Worker gets 10 ms of CPU. More to the point, it keeps
 * `IMAGEKIT_PRIVATE_KEY` on this server - the browser sends the original file
 * to a server action, and only a path ever reaches the API.
 */

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024

const QUALITY_STEPS = [82, 75, 68, 60, 52, 45]

export interface EncodeOptions {
  /** Longest edge, in pixels. */
  width: number
  /**
   * Quality drops step by step until the file fits under this.
   *
   * Best effort, not a guarantee: after the lowest step the result is returned
   * whether or not it fits. A photograph reaches it long before then; an image
   * of pure noise never will, and dropping quality further - or refusing the
   * upload - would serve the operator worse than a slightly large file.
   */
  targetBytes: number
}

/** Photos: the same gate as the Part 3 CLI - 1200px WebP under 200 KB. */
export const PHOTO: EncodeOptions = { width: 1200, targetBytes: 200 * 1024 }

/**
 * Icons: tiny, because they are drawn at about 40px in a chip and a list row.
 * Sending a 1200px photo to render at 40px would waste most of a visitor's
 * download on pixels they never see.
 */
export const ICON: EncodeOptions = { width: 256, targetBytes: 40 * 1024 }

export async function encode(source: Buffer, options: EncodeOptions) {
  let last
  for (const quality of QUALITY_STEPS) {
    const { data, info } = await sharp(source)
      .rotate() // applies EXIF orientation, or phone photos land sideways
      .resize({ width: options.width, withoutEnlargement: true })
      .webp({ quality })
      .toBuffer({ resolveWithObject: true })

    last = { buffer: data, width: info.width, height: info.height }
    if (data.byteLength <= options.targetBytes) break
  }
  return last!
}

export async function uploadToImageKit(
  privateKey: string,
  buffer: Buffer,
  fileName: string,
  folder: string,
): Promise<string> {
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

/** The checks every upload form needs before a file is worth decoding. */
export function checkFile(file: FormDataEntryValue | null): { error: string } | { file: File } {
  if (!(file instanceof File) || file.size === 0) return { error: 'Choose an image first' }
  if (file.size > MAX_UPLOAD_BYTES) return { error: 'That file is over 25 MB' }
  if (!file.type.startsWith('image/')) return { error: 'That is not an image' }
  return { file }
}
