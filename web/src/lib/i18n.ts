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

/** Metres below a kilometre, then one decimal: "320 m", "1.4 km". */
const distanceEn = (meters: number) =>
  meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`

const distanceMy = (meters: number) =>
  meters < 1000 ? `${meters} မီတာ` : `${(meters / 1000).toFixed(1)} ကီလိုမီတာ`

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

  // Price. A level is shown as a word, not as "₭₭ of ₭₭₭": the symbol row
  // means nothing on its own and is read out as noise by a screen reader.
  price: 'Price',
  priceLevels: ['Inexpensive', 'Moderate', 'Expensive'],
  perPerson: 'per person',
  /** Myanmar writes amounts in kyat as "3,000 Ks". */
  money: (amount: number) => `${amount.toLocaleString('en-US')} Ks`,
  priceFrom: (amount: string) => `From ${amount}`,
  priceUpTo: (amount: string) => `Up to ${amount}`,

  amenities: 'What this place has',

  about: 'About',
  onTheMap: 'On the map',

  // Filters
  distance: distanceEn,
  filterOpenNow: 'Open now',
  filterNearest: 'Nearest first',
  filterLocating: 'Finding you…',
  filterClear: 'Clear filters',
  filterNothingMatches: 'No places match these filters.',
  filterNoLocation: 'Location is unavailable, so nearest first is off.',
  filterMatching: (shown: number, total: number) => `Showing ${shown} of ${total}`,

  // Saved places
  saved: 'Saved',
  savedTitle: 'Saved places',
  savedIntro: 'Places you kept, on this device.',
  savedAdd: 'Save this place',
  savedRemove: 'Saved - tap to remove',
  savedEmpty: 'Nothing saved yet. Tap the heart on any place and it will wait for you here.',
  savedBrowse: 'Browse places',
  savedClear: 'Remove all',
  savedLoading: 'Opening your list…',
  // Said plainly rather than hidden: there is no account, so the list does not
  // follow anyone to another phone.
  savedOnThisDevice: 'Kept in this browser only.',

  // Offline and installing
  offlineTitle: 'No connection',
  offlineBody: 'Pages you have already opened still work. This one has not been opened yet.',
  installTitle: 'Add Place Map to your phone',
  installBody: 'Opens like an app, and the places you have looked at still open without a signal.',
  installAction: 'Add to home screen',
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
  // Share
  share: 'Share',
  shareCopied: 'Link copied',

  // Suggesting a place, and reporting one that is wrong
  suggest: {
    nav: 'Suggest a place',
    title: 'Suggest a place',
    intro: 'Know somewhere that should be here? Tell us and we will look it up.',
    reportTitle: 'Report a problem',
    reportIntro: (name: string) => `Something wrong with ${name}? Tell us what, and we will check it.`,
    reportLink: 'Report a problem',
    name: 'Name of the place',
    namePlaceholder: 'e.g. Shwe Cafe',
    note: 'What should we know?',
    notePlaceholder: 'Where it is, what it is, and anything else worth knowing.',
    noteReportPlaceholder: 'The phone number is wrong, it has closed down, the hours have changed…',
    contact: 'Your email or phone',
    contactHint: 'Only so we can ask you a question. Leave it blank if you would rather not.',
    optional: 'optional',
    send: 'Send',
    sending: 'Sending…',
    thanks: 'Thank you',
    thanksBody: 'Somebody reads every one of these. If you left a contact we may ask you a question.',
    sendAnother: 'Send another',
    tooShort: 'Please write a little more.',
    needName: 'What is the place called?',
    tooMany: 'That is a lot of suggestions in one go. Please try again in an hour.',
    failed: 'That could not be sent. Check your connection and try again.',
  },
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
    distance: distanceEn,
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

  price: 'ဈေးနှုန်း',
  priceLevels: ['သက်သာ', 'အလယ်အလတ်', 'ဈေးကြီး'],
  perPerson: 'တစ်ဦးလျှင်',
  money: (amount: number) => `${amount.toLocaleString('en-US')} ကျပ်`,
  priceFrom: (amount: string) => `${amount} မှ စ၍`,
  priceUpTo: (amount: string) => `${amount} အထိ`,

  amenities: 'ဤနေရာတွင် ရရှိနိုင်သည်',

  about: 'အကြောင်း',
  onTheMap: 'မြေပုံပေါ်တွင်',

  distance: distanceMy,
  filterOpenNow: 'ယခုဖွင့်ထားသည်',
  filterNearest: 'အနီးဆုံးမှ',
  filterLocating: 'တည်နေရာ ရှာနေသည်…',
  filterClear: 'စစ်ထုတ်မှု ဖယ်ရှားရန်',
  filterNothingMatches: 'ဤစစ်ထုတ်မှုများနှင့် ကိုက်ညီသော နေရာ မရှိပါ။',
  filterNoLocation: 'တည်နေရာ မရရှိပါ။ အနီးဆုံးမှ စီခြင်းကို ပိတ်ထားသည်။',
  filterMatching: (shown: number, total: number) => `${total} ခုအနက် ${shown} ခု ပြသနေသည်`,

  saved: 'သိမ်းထားသည်',
  savedTitle: 'သိမ်းထားသော နေရာများ',
  savedIntro: 'ဤစက်တွင် သိမ်းထားသော နေရာများ။',
  savedAdd: 'ဤနေရာကို သိမ်းရန်',
  savedRemove: 'သိမ်းထားသည် - ဖယ်ရှားရန် နှိပ်ပါ',
  savedEmpty: 'မသိမ်းရသေးပါ။ နှစ်သက်သော နေရာတွင် နှလုံးပုံကို နှိပ်ပါ၊ ဤနေရာတွင် စောင့်နေပါမည်။',
  savedBrowse: 'နေရာများ ကြည့်ရန်',
  savedClear: 'အားလုံး ဖယ်ရှားရန်',
  savedLoading: 'သင့်စာရင်းကို ဖွင့်နေသည်…',
  savedOnThisDevice: 'ဤဘရောက်ဇာတွင်သာ သိမ်းထားသည်။',

  offlineTitle: 'အင်တာနက် မရှိပါ',
  offlineBody: 'ဖွင့်ပြီးသော စာမျက်နှာများကို ဆက်ကြည့်နိုင်ပါသည်။ ဤစာမျက်နှာကို မဖွင့်ရသေးပါ။',
  installTitle: 'Place Map ကို ဖုန်းထဲ ထည့်ပါ',
  installBody: 'အက်ပ်လို ဖွင့်နိုင်ပြီး ကြည့်ပြီးသော နေရာများကို အင်တာနက် မရှိလည်း ဖွင့်နိုင်သည်။',
  installAction: 'ပင်မစာမျက်နှာသို့ ထည့်ရန်',
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
  // Share
  share: 'မျှဝေရန်',
  shareCopied: 'လင့်ခ် ကူးယူပြီးပါပြီ',

  // Suggesting a place, and reporting one that is wrong
  suggest: {
    nav: 'နေရာ အကြံပြုရန်',
    title: 'နေရာ အကြံပြုရန်',
    intro: 'ဤစာရင်းတွင် ပါဝင်သင့်သော နေရာကို သိပါသလား။ ပြောပြပါ၊ ကျွန်ုပ်တို့ ရှာကြည့်ပါမည်။',
    reportTitle: 'အမှား အကြောင်းကြားရန်',
    reportIntro: (name: string) =>
      `${name}တွင် မှားယွင်းနေသည့် အချက် ရှိပါသလား။ ဘာမှားနေသည်ကို ပြောပြပါ၊ ကျွန်ုပ်တို့ စစ်ဆေးပါမည်။`,
    reportLink: 'အမှား အကြောင်းကြားရန်',
    name: 'နေရာအမည်',
    namePlaceholder: 'ဥပမာ - ရွှေကော်ဖီဆိုင်',
    note: 'ဘာကို သိသင့်ပါသလဲ',
    notePlaceholder: 'ဘယ်မှာ ရှိသလဲ၊ ဘာဆိုင်လဲ၊ အခြား သိသင့်သည့် အချက်များ။',
    noteReportPlaceholder: 'ဖုန်းနံပါတ် မှားနေသည်၊ ပိတ်သွားပြီ၊ ဖွင့်ချိန် ပြောင်းလဲသွားသည်…',
    contact: 'သင့် အီးမေးလ် သို့မဟုတ် ဖုန်း',
    contactHint: 'မေးခွန်း ရှိလျှင် ဆက်သွယ်ရန်အတွက်သာ ဖြစ်ပါသည်။ မထည့်လိုပါက အလွတ် ထားနိုင်ပါသည်။',
    optional: 'မထည့်လည်း ရပါသည်',
    send: 'ပို့ရန်',
    sending: 'ပို့နေသည်…',
    thanks: 'ကျေးဇူးတင်ပါသည်',
    thanksBody:
      'ပို့လိုက်သည့် အကြံပြုချက်တိုင်းကို လူတစ်ယောက် ဖတ်ပါသည်။ ဆက်သွယ်ရန် ထည့်ထားပါက မေးခွန်း မေးနိုင်ပါသည်။',
    sendAnother: 'ထပ်ပို့ရန်',
    tooShort: 'နောက်ထပ် အနည်းငယ် ရေးပေးပါ။',
    needName: 'နေရာအမည် ဘာလဲ။',
    tooMany: 'တစ်ချိန်တည်းတွင် အကြံပြုချက် အများလွန်းပါသည်။ တစ်နာရီအကြာ ထပ်ကြိုးစားပါ။',
    failed: 'ပို့၍ မရပါ။ အင်တာနက် ချိတ်ဆက်မှုကို စစ်ဆေးပြီး ထပ်ကြိုးစားပါ။',
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
    distance: distanceMy,
  },
}

const DICTIONARIES: Record<Locale, Dictionary> = { en, my }

export function t(locale: Locale): Dictionary {
  return DICTIONARIES[locale]
}

export function dayLabel(locale: Locale, day: Weekday): string {
  return DICTIONARIES[locale].days[day]
}
