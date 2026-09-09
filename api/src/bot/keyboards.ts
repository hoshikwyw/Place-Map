import type { Category, PlaceSummary } from '@place-map/shared'
import type { InlineKeyboardButton, InlineKeyboardMarkup } from './telegram.js'

/**
 * Telegram caps `callback_data` at 64 **bytes**, and silently rejects the whole
 * keyboard if any button exceeds it. So nothing but numeric ids travels in a
 * button; names, queries and pages are looked up server-side.
 *
 *   home                      back to the category list
 *   c:<id>:<page>             a page of one category's places
 *   p:<id>:<catId>:<page>     one place, plus the list page to return to
 *   nop                       a non-button (page counter) that must still answer
 *
 * The place button carries its origin because a callback query says nothing
 * about how the user got there - without it, "Back" from page 4 would dump
 * them on page 1. Worst case is about 18 bytes, well inside the cap.
 */

export type Action =
  | { type: 'home' }
  | { type: 'category'; id: number; page: number }
  | { type: 'place'; id: number; categoryId: number; page: number }
  | { type: 'nop' }

export function encode(action: Action): string {
  switch (action.type) {
    case 'home':
      return 'home'
    case 'category':
      return `c:${action.id}:${action.page}`
    case 'place':
      return `p:${action.id}:${action.categoryId}:${action.page}`
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

export function placesKeyboard(
  places: PlaceSummary[],
  categoryId: number,
  page: number,
  totalPages: number,
): InlineKeyboardMarkup {
  const rows: InlineKeyboardButton[][] = places.map((place) => [
    {
      text: place.name,
      callback_data: encode({ type: 'place', id: place.id, categoryId, page }),
    },
  ])

  if (totalPages > 1) {
    const nav: InlineKeyboardButton[] = []

    if (page > 1) {
      nav.push({
        text: '« Prev',
        callback_data: encode({ type: 'category', id: categoryId, page: page - 1 }),
      })
    }

    nav.push({ text: `${page}/${totalPages}`, callback_data: encode({ type: 'nop' }) })

    if (page < totalPages) {
      nav.push({
        text: 'Next »',
        callback_data: encode({ type: 'category', id: categoryId, page: page + 1 }),
      })
    }

    rows.push(nav)
  }

  rows.push([{ text: '← Categories', callback_data: encode({ type: 'home' }) }])
  return { inline_keyboard: rows }
}

export function placeKeyboard(
  place: { location: { lat: number; lng: number } | null; website: string | null },
  categoryId: number,
  page: number,
): InlineKeyboardMarkup {
  const rows: InlineKeyboardButton[][] = []
  const links: InlineKeyboardButton[] = []

  if (place.location) {
    // A URL button, not sendLocation: a location message cannot be edited away,
    // so it would break the edit-in-place navigation and litter the chat.
    links.push({
      text: '📍 Map',
      url: `https://www.google.com/maps/search/?api=1&query=${place.location.lat},${place.location.lng}`,
    })
  }

  if (place.website) {
    links.push({ text: '🌐 Website', url: place.website })
  }

  if (links.length > 0) rows.push(links)

  rows.push([
    { text: '← Back', callback_data: encode({ type: 'category', id: categoryId, page }) },
    { text: '⌂ Categories', callback_data: encode({ type: 'home' }) },
  ])

  return { inline_keyboard: rows }
}

/**
 * Search results have no pager - see the note in handlers.ts. Each result
 * returns to its own category rather than to the search, since the query
 * itself cannot fit in `callback_data`.
 */
export function searchKeyboard(places: PlaceSummary[]): InlineKeyboardMarkup {
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
  rows.push([{ text: '⌂ Categories', callback_data: encode({ type: 'home' }) }])
  return { inline_keyboard: rows }
}
