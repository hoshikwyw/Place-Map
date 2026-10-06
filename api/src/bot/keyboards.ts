import type { Category, LinkType, NearbyPlace, PlaceLink, PlaceSummary } from '@place-map/shared'
import { strings } from './strings.js'
import type { InlineKeyboardButton, InlineKeyboardMarkup, ReplyKeyboardMarkup } from './telegram.js'

/**
 * Telegram caps `callback_data` at 64 **bytes**, and silently rejects the whole
 * keyboard if any button exceeds it. So nothing but numeric ids travels in a
 * button; names, queries and pages are looked up server-side.
 *
 *   home                           back to the category list
 *   c:<id>:<page>                  a page of one category's places
 *   p:<id>:<catId>:<page>          one place, plus the list page to return to
 *   n:<catId>:<lat>:<lng>:<page>   a page of what is nearest to a point
 *   pn:<id>:<catId>:<lat>:<lng>:<page>   one place, returning to that nearby page
 *   nop                            a non-button (page counter) that must still answer
 *
 * The place button carries its origin because a callback query says nothing
 * about how the user got there - without it, "Back" from page 4 would dump
 * them on page 1.
 *
 * A shared location travels in the buttons for the same reason, and for one
 * more: it means the bot stores nobody's whereabouts. The coordinates live in
 * the keyboard of one screen and are gone when that screen is replaced, so
 * "used for this search only" is literally true. Four decimal places is about
 * 11 metres - far finer than a "what is near me" answer needs - and keeps the
 * worst case (pn:999999999:999999:-89.9999:-179.9999:99999, 44 bytes) inside
 * the cap.
 */

/** Rounded on the way into a button, never after: see the note above. */
const COORD_DECIMALS = 4

export interface Point {
  lat: number
  lng: number
}

const coord = (value: number): string => String(Number(value.toFixed(COORD_DECIMALS)))

/** A category id of 0 in a nearby button means "every category". */
export const ALL_CATEGORIES = 0

export type Action =
  | { type: 'home' }
  | { type: 'category'; id: number; page: number }
  | { type: 'place'; id: number; categoryId: number; page: number }
  | { type: 'nearby'; categoryId: number; at: Point; page: number }
  | { type: 'nearPlace'; id: number; categoryId: number; at: Point; page: number }
  | { type: 'nop' }

export function encode(action: Action): string {
  switch (action.type) {
    case 'home':
      return 'home'
    case 'category':
      return `c:${action.id}:${action.page}`
    case 'place':
      return `p:${action.id}:${action.categoryId}:${action.page}`
    case 'nearby':
      return `n:${action.categoryId}:${coord(action.at.lat)}:${coord(action.at.lng)}:${action.page}`
    case 'nearPlace':
      return `pn:${action.id}:${action.categoryId}:${coord(action.at.lat)}:${coord(action.at.lng)}:${action.page}`
    case 'nop':
      return 'nop'
  }
}

export function decode(data: string | undefined): Action | null {
  if (!data) return null
  if (data === 'home') return { type: 'home' }
  if (data === 'nop') return { type: 'nop' }

  const parts = data.split(':')

  if (parts[0] === 'c' && parts.length === 3) {
    const id = Number(parts[1])
    const page = Number(parts[2])
    if (Number.isInteger(id) && Number.isInteger(page) && page > 0) {
      return { type: 'category', id, page }
    }
  }

  // A point is only usable if both halves are real and in range - a callback
  // is user input, and these go straight into a database query.
  const point = (lat: string | undefined, lng: string | undefined): Point | null => {
    const latitude = Number(lat)
    const longitude = Number(lng)
    const ok =
      lat !== undefined &&
      lng !== undefined &&
      lat !== '' &&
      lng !== '' &&
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      Math.abs(latitude) <= 90 &&
      Math.abs(longitude) <= 180
    return ok ? { lat: latitude, lng: longitude } : null
  }

  if (parts[0] === 'n' && parts.length === 5) {
    const categoryId = Number(parts[1])
    const at = point(parts[2], parts[3])
    const page = Number(parts[4])
    if (Number.isInteger(categoryId) && categoryId >= 0 && at && Number.isInteger(page) && page > 0) {
      return { type: 'nearby', categoryId, at, page }
    }
  }

  if (parts[0] === 'pn' && parts.length === 6) {
    const id = Number(parts[1])
    const categoryId = Number(parts[2])
    const at = point(parts[3], parts[4])
    const page = Number(parts[5])
    if (
      Number.isInteger(id) &&
      Number.isInteger(categoryId) &&
      categoryId >= 0 &&
      at &&
      Number.isInteger(page) &&
      page > 0
    ) {
      return { type: 'nearPlace', id, categoryId, at, page }
    }
  }

  if (parts[0] === 'p' && parts.length === 4) {
    const id = Number(parts[1])
    const categoryId = Number(parts[2])
    const page = Number(parts[3])
    if (Number.isInteger(id) && Number.isInteger(categoryId) && Number.isInteger(page) && page > 0) {
      return { type: 'place', id, categoryId, page }
    }
  }

  return null
}

// ------------------------------------------------------------------ keyboards

/** Two per row: category names are short, and one per row wastes screen. */
export function categoriesKeyboard(categories: Category[]): InlineKeyboardMarkup {
  const rows: InlineKeyboardButton[][] = []

  for (let i = 0; i < categories.length; i += 2) {
    rows.push(
      categories.slice(i, i + 2).map((category) => ({
        text: category.icon ? `${category.icon} ${category.name}` : category.name,
        callback_data: encode({ type: 'category', id: category.id, page: 1 }),
      })),
    )
  }

  return { inline_keyboard: rows }
}

/**
 * A pager row, or nothing when everything fits on one page. The page counter
 * is a button because Telegram has no other way to put a label in a keyboard;
 * it answers with 'nop' so tapping it does not spin forever.
 */
function pager(
  page: number,
  totalPages: number,
  lang: string,
  to: (page: number) => Action,
): InlineKeyboardButton[] | null {
  if (totalPages <= 1) return null
  const t = strings(lang)
  const nav: InlineKeyboardButton[] = []

  if (page > 1) nav.push({ text: t.prev, callback_data: encode(to(page - 1)) })
  nav.push({ text: `${page}/${totalPages}`, callback_data: encode({ type: 'nop' }) })
  if (page < totalPages) nav.push({ text: t.next, callback_data: encode(to(page + 1)) })

  return nav
}

export function placesKeyboard(
  places: PlaceSummary[],
  categoryId: number,
  page: number,
  totalPages: number,
  lang: string,
): InlineKeyboardMarkup {
  const rows: InlineKeyboardButton[][] = places.map((place) => [
    {
      text: place.name,
      callback_data: encode({ type: 'place', id: place.id, categoryId, page }),
    },
  ])

  const nav = pager(page, totalPages, lang, (target) => ({
    type: 'category',
    id: categoryId,
    page: target,
  }))
  if (nav) rows.push(nav)

  rows.push([{ text: strings(lang).home, callback_data: encode({ type: 'home' }) }])
  return { inline_keyboard: rows }
}

/**
 * What is nearest to a shared point. Each button carries the distance, which
 * is the one thing this list has that the category list does not, and the row
 * of categories underneath narrows the same point to one kind of place - the
 * second tap of "cafes near me" when the bot was never told what was wanted.
 */
export function nearbyKeyboard(
  places: NearbyPlace[],
  categories: Category[],
  categoryId: number,
  at: Point,
  page: number,
  totalPages: number,
  lang: string,
): InlineKeyboardMarkup {
  const t = strings(lang)
  const rows: InlineKeyboardButton[][] = places.map((place) => [
    {
      text:
        place.distance_m === null
          ? place.name
          : `${place.name} · ${t.distance(place.distance_m)}`,
      callback_data: encode({ type: 'nearPlace', id: place.id, categoryId, at, page }),
    },
  ])

  const nav = pager(page, totalPages, lang, (target) => ({
    type: 'nearby',
    categoryId,
    at,
    page: target,
  }))
  if (nav) rows.push(nav)

  // Narrow the same point by category. The one in use is left out; "All"
  // takes its place so there is always a way back to the full list.
  const filters: InlineKeyboardButton[] = []
  if (categoryId !== ALL_CATEGORIES) {
    filters.push({
      text: t.allCategories,
      callback_data: encode({ type: 'nearby', categoryId: ALL_CATEGORIES, at, page: 1 }),
    })
  }
  for (const category of categories) {
    if (category.id === categoryId) continue
    filters.push({
      text: category.icon ? `${category.icon} ${category.name}` : category.name,
      callback_data: encode({ type: 'nearby', categoryId: category.id, at, page: 1 }),
    })
  }
  for (let i = 0; i < filters.length; i += 2) rows.push(filters.slice(i, i + 2))

  rows.push([{ text: t.home, callback_data: encode({ type: 'home' }) }])
  return { inline_keyboard: rows }
}

/**
 * The keyboard below the text box. It is the only way to ask for a location,
 * and Telegram honours `request_location` in private chats only.
 */
export function locationKeyboard(lang: string): ReplyKeyboardMarkup {
  return {
    keyboard: [[{ text: strings(lang).shareLocation, request_location: true }]],
    resize_keyboard: true,
    is_persistent: true,
  }
}

/** One per platform, so a row of links reads at a glance. */
const LINK_ICONS: Record<LinkType, string> = {
  website: '🌐',
  facebook: 'f',
  instagram: '◎',
  tiktok: '♪',
  youtube: '▶',
  telegram: '✈',
  viber: '📞',
  whatsapp: '💬',
  x: '𝕏',
  other: '🔗',
}

/** "Facebook", or the place's own label when it gave one. */
function linkText(link: PlaceLink, lang: string): string {
  const icon = LINK_ICONS[link.type]
  if (link.label) return `${icon} ${link.label}`
  if (link.type === 'website') return strings(lang).website
  return `${icon} ${link.type.charAt(0).toUpperCase()}${link.type.slice(1)}`
}

export function placeKeyboard(
  place: {
    location: { lat: number; lng: number } | null
    website: string | null
    links?: PlaceLink[]
  },
  back: Action,
  lang: string,
): InlineKeyboardMarkup {
  const t = strings(lang)
  const rows: InlineKeyboardButton[][] = []
  const links: InlineKeyboardButton[] = []

  if (place.location) {
    // A URL button, not sendLocation: a location message cannot be edited away,
    // so it would break the edit-in-place navigation and litter the chat.
    links.push({
      text: t.map,
      url: `https://www.google.com/maps/search/?api=1&query=${place.location.lat},${place.location.lng}`,
    })
  }

  // `links` is the current shape; `website` is the single-link column it grew
  // out of, still filled for clients that only know about one.
  const extra = place.links?.length
    ? place.links
    : place.website
      ? [{ type: 'website' as const, url: place.website, label: null }]
      : []

  for (const link of extra) {
    links.push({ text: linkText(link, lang), url: link.url })
  }

  // Two per row: Telegram shrinks the text of a crowded row until it truncates.
  for (let i = 0; i < links.length; i += 2) rows.push(links.slice(i, i + 2))

  rows.push([
    { text: t.back, callback_data: encode(back) },
    { text: t.home, callback_data: encode({ type: 'home' }) },
  ])

  return { inline_keyboard: rows }
}

/**
 * Search results have no pager - see the note in handlers.ts. Each result
 * returns to its own category rather than to the search, since the query
 * itself cannot fit in `callback_data`.
 */
export function searchKeyboard(places: PlaceSummary[], lang: string): InlineKeyboardMarkup {
  const rows: InlineKeyboardButton[][] = places.map((place) => [
    {
      text: place.name,
      callback_data: encode({
        type: 'place',
        id: place.id,
        categoryId: place.category.id,
        page: 1,
      }),
    },
  ])
  rows.push([{ text: strings(lang).home, callback_data: encode({ type: 'home' }) }])
  return { inline_keyboard: rows }
}
