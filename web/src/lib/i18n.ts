import type { Weekday } from '@place-map/shared'

/**
 * Locales are code, not configuration: every entry needs a full dictionary
 * below, so adding one to an env var without translating would ship a site
 * that is half English. Keep in step with the API's SUPPORTED_LANGS.
 */
export const LOCALES = ['en', 'my'] as const
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

const my: Dictionary = {
  siteName: 'Place Map',
  tagline: 'ကော်ဖီဆိုင်၊ စားသောက်ဆိုင်၊ ပန်းခြံနှင့် အခြားနေရာများ - ဖွင့်ချိန်၊ ဓာတ်ပုံနှင့် မြေပုံတို့နှင့်အတူ။',
  language: 'မြန်မာ',
  categories: 'အမျိုးအစားများ',
  allPlaces: 'နေရာအားလုံး',
  search: 'ရှာဖွေရန်',
  searchPlaceholder: 'နေရာများ ရှာဖွေပါ…',
  searchResults: (q: string) => `“${q}” အတွက် ရလဒ်များ`,
  noResults: (q: string) => `“${q}” အတွက် ဘာမှ မတွေ့ပါ။`,
  queryTooShort: 'အနည်းဆုံး စာလုံး ၂ လုံး ရိုက်ထည့်ပါ။',
  places: (n: number) => `နေရာ ${n} ခု`,
  emptyCategory: 'ဒီမှာ ဘာမှ မရှိသေးပါ။',
  previous: 'ယခင်',
  next: 'နောက်',
  pageOf: (page: number, total: number) => `စာမျက်နှာ ${page} / ${total}`,
  openNow: 'ယခု ဖွင့်ထားသည်',
  closesAt: (time: string) => `${time} တွင် ပိတ်မည်`,
  closedNow: 'ယခု ပိတ်ထားသည်',
  hours: 'ဖွင့်ချိန်',
  closed: 'ပိတ်',
  address: 'လိပ်စာ',
  phone: 'ဖုန်း',
  website: 'ဝက်ဘ်ဆိုက်',
  directions: 'လမ်းညွှန်',
  map: 'မြေပုံ',
  photos: 'ဓာတ်ပုံများ',
  notFoundTitle: 'ရှာမတွေ့ပါ',
  notFoundBody: 'ဤစာမျက်နှာ မရှိပါ၊ သို့မဟုတ် ဤနေရာကို စာရင်းမှ ဖယ်ရှားပြီးဖြစ်သည်။',
  backHome: 'အမျိုးအစားအားလုံးသို့ ပြန်သွားရန်',
  errorTitle: 'တစ်ခုခု မှားယွင်းနေပါသည်',
  errorBody: 'ဤစာမျက်နှာကို ယခု ဖွင့်၍မရပါ။ ခဏနေမှ ထပ်ကြိုးစားပါ။',
  tryAgain: 'ထပ်ကြိုးစားရန်',
  // Myanmar has no customary short forms for weekdays; the full names are used.
  days: {
    mon: 'တနင်္လာ',
    tue: 'အင်္ဂါ',
    wed: 'ဗုဒ္ဓဟူး',
    thu: 'ကြာသပတေး',
    fri: 'သောကြာ',
    sat: 'စနေ',
    sun: 'တနင်္ဂနွေ',
  },
}

const DICTIONARIES: Record<Locale, Dictionary> = { en, my }

export function t(locale: Locale): Dictionary {
  return DICTIONARIES[locale]
}

export function dayLabel(locale: Locale, day: Weekday): string {
  return DICTIONARIES[locale].days[day]
}
