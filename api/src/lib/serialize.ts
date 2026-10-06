import {
  AMENITIES,
  PRICE_CURRENCY,
  PlaceLinkSchema,
  type Category,
  type Place,
  type PlaceImage,
  type PlaceSummary,
} from '@place-map/shared'
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

export function toCategory(env: Env, row: Row, lang: string, fallback: string): Category {
  const image = row.icon_image as string | null | undefined
  return {
    id: Number(row.id),
    slug: String(row.slug),
    name: pickText(row.name, lang, fallback) ?? String(row.slug),
    icon: (row.icon as string | null) ?? null,
    // Stored as a path; clients need somewhere to fetch it from.
    icon_image: image ? imageUrl(env, image) : null,
  }
}

/**
 * The three price columns become one object, or nothing at all. A place with
 * neither a level nor an amount has no price to show, and `price: {level:
 * null, min: null, max: null}` would make every client check three fields to
 * learn that.
 */
function toPrice(row: Row): Place['price'] {
  const level = row.price_level == null ? null : Number(row.price_level)
  const min = row.price_min == null ? null : Number(row.price_min)
  const max = row.price_max == null ? null : Number(row.price_max)

  const valid = level === 1 || level === 2 || level === 3 ? level : null
  if (valid === null && min === null && max === null) return null

  return { level: valid, min, max, currency: PRICE_CURRENCY }
}

function base(env: Env, row: Row, lang: string, fallback: string) {
  const category = one(row.category)
  const lat = row.lat as number | null
  const lng = row.lng as number | null

  return {
    id: Number(row.id),
    slug: String(row.slug),
    category: category
      ? toCategory(env, category, lang, fallback)
      : { id: 0, slug: 'unknown', name: 'Unknown', icon: null, icon_image: null },
    name: pickText(row.name, lang, fallback) ?? String(row.slug),
    description: pickText(row.description, lang, fallback),
    address: (row.address as string | null) ?? null,
    location: lat != null && lng != null ? { lat, lng } : null,
    phone: (row.phone as string | null) ?? null,
    website: (row.website as string | null) ?? null,
    // Stored as jsonb, so a hand-edited row could hold anything: keep the
    // entries that are usable and drop the rest rather than failing the read.
    links: Array.isArray(row.links)
      ? (row.links as unknown[]).flatMap((entry) => {
          const parsed = PlaceLinkSchema.safeParse(entry)
          return parsed.success ? [parsed.data] : []
        })
      : [],
    opening_hours: (row.opening_hours as Place['opening_hours']) ?? null,
    price: toPrice(row),
    // Unknown entries are dropped rather than failing the read, as with links:
    // a slug retired from AMENITIES would otherwise break every place that
    // still carries it.
    amenities: Array.isArray(row.amenities)
      ? AMENITIES.filter((amenity) => (row.amenities as unknown[]).includes(amenity))
      : [],
    // Postgres returns numeric as a string, to keep the exact decimal.
    rating: row.rating == null ? null : Number(row.rating),
    rating_count: Number(row.rating_count ?? 0),
  }
}

export function toPlace(env: Env, row: Row, lang: string, fallback: string): Place {
  return {
    ...base(env, row, lang, fallback),
    images: sortedImages(row).map((image) => toImage(env, image)),
  }
}

/** List rows carry only the first image - a card does not need the rest. */
export function toPlaceSummary(env: Env, row: Row, lang: string, fallback: string): PlaceSummary {
  const first = sortedImages(row)[0]
  return {
    ...base(env, row, lang, fallback),
    image: first ? toImage(env, first) : null,
  }
}
