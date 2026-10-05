import 'server-only'
import { env } from './env'

/**
 * Turns a stored path - what the API records for a photo or a category icon -
 * into something a browser can fetch.
 *
 * Null when ImageKit is not configured: the dashboard still works without it,
 * and a half-built URL would only produce broken images.
 */
export function imageUrl(storagePath: string | null | undefined): string | null {
  const endpoint = env.imagekit?.endpoint
  if (!endpoint || !storagePath) return null
  return `${endpoint}/${storagePath.replace(/^\/+/, '')}`
}
