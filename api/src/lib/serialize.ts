import type { Category, Place, PlaceImage, PlaceSummary } from '@place-map/shared'
import type { Env } from '../types.js'
import { pickText } from './lang.js'

/** Shape of a row as PostgREST returns it - jsonb still unresolved. */
type Row = Record<string, unknown>

export function imageUrl(env: Env, storagePath: string): string {
  const base = env.IMAGEKIT_URL_ENDPOINT.replace(/\/+$/, '')
  const path = String(storagePath).replace(/^\/+/, '')
  return `${base}/${path}`
}

function toImage(env: Env, row: Row): PlaceImage {
  return {
    url: imageUrl(env, String(row.storage_path)),
    width: (row.width as number | null) ?? null,
    height: (row.height as number | null) ?? null,
  }
}

/** PostgREST returns an embedded to-one relation as an object, but as an array
 *  in some shapes. Normalise both. */
function one(value: unknown): Row | null {
  if (Array.isArray(value)) return (value[0] as Row | undefined) ?? null
  if (value && typeof value === 'object') return value as Row
  return null
}

function sortedImages(row: Row): Row[] {
  const images = Array.isArray(row.images) ? (row.images as Row[]) : []
  return [...images].sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
}

export function toCategory(row: Row, lang: string, fallback: string): Category {
  return {
    id: Number(row.id),
    slug: String(row.slug),
    name: pickText(row.name, lang, fallback) ?? String(row.slug),
    icon: (row.icon as string | null) ?? null,
  }
}

function base(row: Row, lang: string, fallback: string) {
  const category = one(row.category)
  const lat = row.lat as number | null
  const lng = row.lng as number | null

  return {
    id: Number(row.id),
    slug: String(row.slug),
    category: category
      ? toCategory(category, lang, fallback)
      : { id: 0, slug: 'unknown', name: 'Unknown', icon: null },
    name: pickText(row.name, lang, fallback) ?? String(row.slug),
    description: pickText(row.description, lang, fallback),
    address: (row.address as string | null) ?? null,
    location: lat != null && lng != null ? { lat, lng } : null,
    phone: (row.phone as string | null) ?? null,
    website: (row.website as string | null) ?? null,
    opening_hours: (row.opening_hours as Place['opening_hours']) ?? null,
  }
}

export function toPlace(env: Env, row: Row, lang: string, fallback: string): Place {
  return {
    ...base(row, lang, fallback),
    images: sortedImages(row).map((image) => toImage(env, image)),
  }
}

/** List rows carry only the first image - a card does not need the rest. */
export function toPlaceSummary(env: Env, row: Row, lang: string, fallback: string): PlaceSummary {
  const first = sortedImages(row)[0]
  return {
    ...base(row, lang, fallback),
    image: first ? toImage(env, first) : null,
  }
}
