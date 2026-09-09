import { env } from './env.ts'

const UPLOAD_URL = 'https://upload.imagekit.io/api/v1/files/upload'

export interface UploadResult {
  fileId: string
  name: string
  /** Path inside the media library, e.g. `/places/cafe-central/cafe-central-1.webp`. */
  filePath: string
  url: string
  width?: number
  height?: number
  size: number
}

/**
 * ImageKit authenticates uploads with HTTP Basic: the private key as the
 * username and an empty password.
 */
function authHeader(): string {
  return `Basic ${Buffer.from(`${env.imagekitPrivateKey}:`).toString('base64')}`
}

/**
 * `useUniqueFileName: false` plus `overwriteFile: true` makes the path a
 * deterministic function of (place slug, index). Re-running the script replaces
 * an image in place instead of littering the library with `image_x7Kd9.webp`
 * copies that nothing references and the free quota still pays for.
 */
export async function upload(
  buffer: Buffer,
  { fileName, folder }: { fileName: string; folder: string },
): Promise<UploadResult> {
  const form = new FormData()
  form.append('file', new Blob([new Uint8Array(buffer)], { type: 'image/webp' }), fileName)
  form.append('fileName', fileName)
  form.append('folder', folder)
  form.append('useUniqueFileName', 'false')
  form.append('overwriteFile', 'true')

  const res = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: { Authorization: authHeader() },
    body: form,
  })

  const body = await res.text()
  if (!res.ok) {
    throw new Error(`ImageKit upload failed (${res.status}): ${body}`)
  }

  return JSON.parse(body) as UploadResult
}
