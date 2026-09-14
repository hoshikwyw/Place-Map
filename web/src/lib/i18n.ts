import type { Weekday } from '@place-map/shared'

/**
 * Locales are code, not configuration: every entry needs a full dictionary
 * below, so adding one to an env var without translating would ship a site
 * that is half English. Keep in step with the API's SUPPORTED_LANGS.
 */
export const LOCALES = ['en', 'uz'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'en'

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value)
}

const en = {
  siteName: 'Place Map',
  tagline: 'Cafes, restaurants, parks and more - with hours, photos and a map.',
  language: 'English',
  categories: 'Categories',
  allPlaces: 'All places',
  search: 'Search',
  searchPlaceholder: 'Search places…',
  searchResults: (q: string) => `Results for “${q}”`,
  noResults: (q: string) => `Nothing found for “${q}”.`,
  queryTooShort: 'Type at least 2 characters.',
  places: (n: number) => (n === 1 ? '1 place' : `${n} places`),
  emptyCategory: 'Nothing here yet.',
  previous: 'Previous',
  next: 'Next',
  pageOf: (page: number, total: number) => `Page ${page} of ${total}`,
  openNow: 'Open now',
  closesAt: (time: string) => `Closes ${time}`,
  closedNow: 'Closed now',
  hours: 'Opening hours',
  closed: 'Closed',
  address: 'Address',
  phone: 'Phone',
  website: 'Website',
  directions: 'Directions',
  map: 'Map',
  photos: 'Photos',
  notFoundTitle: 'Not found',
  notFoundBody: 'That page does not exist, or the place is no longer listed.',
  backHome: 'Back to all categories',
  errorTitle: 'Something went wrong',
  errorBody: 'This page could not be loaded right now. Please try again in a moment.',
  tryAgain: 'Try again',
  days: { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' },
}

type Dictionary = typeof en

const uz: Dictionary = {
  siteName: 'Place Map',
  tagline: 'Kafelar, restoranlar, bog‘lar va boshqalar - ish vaqti, rasmlar va xarita bilan.',
  language: 'O‘zbekcha',
  categories: 'Toifalar',
  allPlaces: 'Barcha joylar',
  search: 'Qidirish',
  searchPlaceholder: 'Joylarni qidiring…',
  searchResults: (q: string) => `“${q}” bo‘yicha natijalar`,
  noResults: (q: string) => `“${q}” bo‘yicha hech narsa topilmadi.`,
  queryTooShort: 'Kamida 2 ta belgi kiriting.',
  places: (n: number) => `${n} ta joy`,
  emptyCategory: 'Bu yerda hozircha hech narsa yo‘q.',
  previous: 'Oldingi',
  next: 'Keyingi',
  pageOf: (page: number, total: number) => `${total} sahifadan ${page}-si`,
  openNow: 'Hozir ochiq',
  closesAt: (time: string) => `${time} da yopiladi`,
  closedNow: 'Hozir yopiq',
  hours: 'Ish vaqti',
  closed: 'Yopiq',
  address: 'Manzil',
  phone: 'Telefon',
  website: 'Veb-sayt',
  directions: 'Yo‘nalish',
  map: 'Xarita',
  photos: 'Rasmlar',
  notFoundTitle: 'Topilmadi',
  notFoundBody: 'Bunday sahifa yo‘q yoki joy endi ro‘yxatda emas.',
  backHome: 'Barcha toifalarga qaytish',
  errorTitle: 'Xatolik yuz berdi',
  errorBody: 'Sahifani hozir yuklab bo‘lmadi. Birozdan so‘ng qayta urinib ko‘ring.',
  tryAgain: 'Qayta urinish',
  days: { mon: 'Du', tue: 'Se', wed: 'Ch', thu: 'Pa', fri: 'Ju', sat: 'Sh', sun: 'Ya' },
}

const DICTIONARIES: Record<Locale, Dictionary> = { en, uz }

export function t(locale: Locale): Dictionary {
  return DICTIONARIES[locale]
}

export function dayLabel(locale: Locale, day: Weekday): string {
  return DICTIONARIES[locale].days[day]
}
