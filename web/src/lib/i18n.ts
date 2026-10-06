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
  languageShort: 'EN',
  appTitle: 'Place Map on your phone',
  appBody: 'The same places, with opening hours and directions, in your pocket.',
  appComingSoon: 'Coming soon',
  appStore: 'App Store',
  playStore: 'Google Play',
  theme: 'Theme',
  themeLight: 'Light',
  themeDark: 'Dark',
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
  links: 'Find them on',
  directions: 'Directions',
  map: 'Map',
  mapIntro: 'Every place on one map. Tap a pin to see what it is.',
  mapEmpty: 'No places have coordinates yet, so there is nothing to show on the map.',
  mapLocate: 'Where am I?',
  mapLocating: 'Finding you…',
  mapList: 'See these places as a list',
  photos: 'Photos',
  ratingLabel: (value: string, count: number) =>
    count > 0 ? `Rated ${value} out of 5, from ${count} ratings` : `Rated ${value} out of 5`,
  ratingCount: (count: number) => `(${count})`,
  photoCounter: (index: number, total: number) => `${index} of ${total}`,
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  close: 'Close',
  notFoundTitle: 'Not found',
  notFoundBody: 'That page does not exist, or the place is no longer listed.',
  backHome: 'Back to all categories',
  errorTitle: 'Something went wrong',
  errorBody: 'This page could not be loaded right now. Please try again in a moment.',
  tryAgain: 'Try again',
  days: { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' },
  assistant: {
    open: 'Ask me',
    title: 'Place finder',
    subtitle: 'Tell me what you are looking for',
    close: 'Close',
    greeting: 'Hi! What are you looking for? Try one of these, or type your own.',
    suggestions: ['Cafe near me', 'Restaurants open now', 'Parks within 2 km'],
    placeholder: 'e.g. cafe near me',
    send: 'Send',
    you: 'You',
    thinking: 'Looking…',
    shareLocation: 'Share my location',
    locating: 'Finding you…',
    locationNote: 'Your location is only used for this search and is not saved.',
    locationDenied: 'Location is blocked for this site. Allow it in your browser settings and try again.',
    locationUnavailable: "I couldn't get your location. Check that location is turned on, then try again.",
    locationUnsupported: "This browser can't share a location.",
    error: "I couldn't reach the server. Check your connection and try again.",
    retry: 'Try again',
    distance: (meters: number) => (meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`),
  },
}

type Dictionary = typeof en

const my: Dictionary = {
  siteName: 'Place Map',
  tagline: 'ကော်ဖီဆိုင်၊ စားသောက်ဆိုင်၊ ပန်းခြံနှင့် အခြားနေရာများ - ဖွင့်ချိန်၊ ဓာတ်ပုံနှင့် မြေပုံတို့နှင့်အတူ။',
  language: 'မြန်မာ',
  languageShort: 'မြန်မာ',
  appTitle: 'ဖုန်းထဲတွင် Place Map',
  appBody: 'ဖွင့်ချိန်နှင့် လမ်းညွှန်များနှင့်အတူ နေရာများကို ဖုန်းထဲမှ ကြည့်ရှုနိုင်ပါပြီ။',
  appComingSoon: 'မကြာမီ ရရှိနိုင်ပါမည်',
  appStore: 'App Store',
  playStore: 'Google Play',
  theme: 'အသွင်အပြင်',
  themeLight: 'အလင်း',
  themeDark: 'အမှောင်',
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
  links: 'အခြား လင့်များ',
  directions: 'လမ်းညွှန်',
  map: 'မြေပုံ',
  mapIntro: 'နေရာအားလုံးကို မြေပုံတစ်ခုတည်းတွင် ကြည့်ရှုနိုင်ပါသည်။ အမှတ်အသားကို နှိပ်၍ အသေးစိတ် ကြည့်ပါ။',
  mapEmpty: 'တည်နေရာ အချက်အလက် ထည့်သွင်းထားသော နေရာ မရှိသေးပါ။',
  mapLocate: 'ကျွန်ုပ် ဘယ်မှာလဲ',
  mapLocating: 'တည်နေရာ ရှာနေသည်…',
  mapList: 'ဤနေရာများကို စာရင်းအဖြစ် ကြည့်ရန်',
  photos: 'ဓာတ်ပုံများ',
  ratingLabel: (value: string, count: number) =>
    count > 0 ? `၅ မှတ်တွင် ${value} မှတ်၊ အဆင့်သတ်မှတ်ချက် ${count} ခုမှ` : `၅ မှတ်တွင် ${value} မှတ်`,
  ratingCount: (count: number) => `(${count})`,
  photoCounter: (index: number, total: number) => `${index} / ${total}`,
  zoomIn: 'ချဲ့ကြည့်ရန်',
  zoomOut: 'ပြန်ချုံ့ရန်',
  close: 'ပိတ်ရန်',
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
  assistant: {
    open: 'မေးရန်',
    title: 'နေရာရှာဖွေသူ',
    subtitle: 'ဘာရှာချင်လဲ ပြောပြပါ',
    close: 'ပိတ်ရန်',
    greeting: 'မင်္ဂလာပါ။ ဘာရှာနေလဲ။ အောက်ပါတို့ထဲမှ ရွေးပါ၊ သို့မဟုတ် ကိုယ်တိုင် ရိုက်ထည့်ပါ။',
    suggestions: ['အနီးက ကော်ဖီဆိုင်', 'အခုဖွင့်ထားတဲ့ စားသောက်ဆိုင်', '၂ ကီလိုမီတာအတွင်း ပန်းခြံ'],
    placeholder: 'ဥပမာ - အနီးက ကော်ဖီဆိုင်',
    send: 'ပို့ရန်',
    you: 'သင်',
    thinking: 'ရှာနေသည်…',
    shareLocation: 'တည်နေရာ မျှဝေရန်',
    locating: 'တည်နေရာ ရှာနေသည်…',
    locationNote: 'သင့်တည်နေရာကို ဤရှာဖွေမှုအတွက်သာ အသုံးပြုပြီး သိမ်းဆည်းမထားပါ။',
    locationDenied: 'ဤဆိုက်အတွက် တည်နေရာကို ပိတ်ထားသည်။ ဘရောက်ဇာ ဆက်တင်တွင် ခွင့်ပြုပြီး ထပ်ကြိုးစားပါ။',
    locationUnavailable: 'တည်နေရာကို ရယူ၍ မရပါ။ တည်နေရာ ဖွင့်ထားကြောင်း စစ်ဆေးပြီး ထပ်ကြိုးစားပါ။',
    locationUnsupported: 'ဤဘရောက်ဇာသည် တည်နေရာ မျှဝေ၍ မရပါ။',
    error: 'ဆာဗာသို့ ချိတ်ဆက်၍ မရပါ။ အင်တာနက် ချိတ်ဆက်မှုကို စစ်ဆေးပြီး ထပ်ကြိုးစားပါ။',
    retry: 'ထပ်ကြိုးစားရန်',
    distance: (meters: number) =>
      meters < 1000 ? `${meters} မီတာ` : `${(meters / 1000).toFixed(1)} ကီလိုမီတာ`,
  },
}

const DICTIONARIES: Record<Locale, Dictionary> = { en, my }

export function t(locale: Locale): Dictionary {
  return DICTIONARIES[locale]
}

export function dayLabel(locale: Locale, day: Weekday): string {
  return DICTIONARIES[locale].days[day]
}
