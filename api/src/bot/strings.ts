/**
 * The bot's own chrome. Place data is translated in the database; these are the
 * words the bot supplies itself, and they have to match the language the API
 * was asked for or a screen ends up half in each.
 *
 * Add a locale here whenever you add one to SUPPORTED_LANGS. Missing keys fall
 * back to English rather than rendering blank.
 */

const en = {
  welcome: 'Choose a category, type what you are looking for, or share your location.',
  categories: 'Categories',
  noCategories: 'No categories yet.',
  emptyCategory: 'Nothing here yet.',
  notFound: 'That place is no longer listed.',
  searching: 'Searching…',
  noResults: (q: string) => `Nothing found for “${q}”.`,
  moreResults: (shown: number, total: number) =>
    `Showing ${shown} of ${total}. Try a more specific search.`,
  queryTooShort: 'Type at least 2 characters to search.',
  closed: 'closed',
  hours: 'Hours',
  phone: 'Phone',
  error: 'Something went wrong. Try /start.',

  // Location
  shareLocation: '📍 Share my location',
  askLocation: 'Tap the button below to share your location, and I will find what is nearest.',
  locationOnlyInPrivate: 'Send me your location in a private chat with me, and I will find what is nearest.',
  nearYou: 'Near you',
  nearYouEmpty: 'Nothing found near you.',
  nearest: (count: number) => (count === 1 ? 'The nearest place' : `The ${count} nearest places`),
  allCategories: 'All',
  locationKept: 'Your location is used for this search only. It is not saved.',

  // Buttons
  prev: '« Prev',
  next: 'Next »',
  back: '← Back',
  home: '⌂ Categories',
  map: '📍 Map',
  website: '🌐 Website',
  nearbyButton: '📍 Near me',
  /**
   * Asked of the assistant on the user's behalf when they share a location
   * rather than type. It has to be a phrase the parser reads as "near me" -
   * see NEAR_WORDS in assistant/keywords.ts.
   */
  nearPhrase: 'near me',

  // Price. The same words the website uses, so a place does not cost one thing
  // in the browser and another in Telegram. The shape of the line is decided
  // in @place-map/shared; these are only the words.
  price: 'Price',
  priceLevels: ['Inexpensive', 'Moderate', 'Expensive'] as readonly string[],
  perPerson: 'per person',
  money: (amount: number) => `${amount.toLocaleString('en-US')} Ks`,
  priceFrom: (amount: string) => `From ${amount}`,
  priceUpTo: (amount: string) => `Up to ${amount}`,

  // Amenities
  amenities: 'What this place has',

  // Place card
  ratingLabel: 'Rating',
  ratingCount: (count: number) => (count === 1 ? '1 rating' : `${count} ratings`),
  distance: (meters: number) =>
    meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`,
  places: (count: number): string => (count === 1 ? 'place' : 'places'),
}

type Strings = typeof en

const my: Partial<Strings> = {
  welcome: 'အမျိုးအစားတစ်ခု ရွေးပါ၊ ရှာချင်သည်ကို ရိုက်ပါ၊ သို့မဟုတ် တည်နေရာ မျှဝေပါ။',
  categories: 'အမျိုးအစားများ',
  noCategories: 'အမျိုးအစား မရှိသေးပါ။',
  emptyCategory: 'ဒီမှာ ဘာမှ မရှိသေးပါ။',
  notFound: 'ဤနေရာကို စာရင်းမှ ဖယ်ရှားပြီးဖြစ်သည်။',
  searching: 'ရှာဖွေနေသည်…',
  noResults: (q: string) => `“${q}” အတွက် ဘာမှ မတွေ့ပါ။`,
  moreResults: (shown: number, total: number) =>
    `${total} ခုအနက် ${shown} ခုကို ပြသနေသည်။ ပိုမိုတိကျစွာ ရှာဖွေပါ။`,
  queryTooShort: 'ရှာဖွေရန် အနည်းဆုံး စာလုံး ၂ လုံး ရိုက်ပါ။',
  closed: 'ပိတ်',
  hours: 'ဖွင့်ချိန်',
  phone: 'ဖုန်း',
  error: 'တစ်ခုခု မှားယွင်းနေပါသည်။ /start ကို နှိပ်ပါ။',

  shareLocation: '📍 တည်နေရာ မျှဝေရန်',
  askLocation: 'အောက်ကခလုတ်ကို နှိပ်၍ တည်နေရာ မျှဝေပါ။ အနီးဆုံးနေရာများကို ရှာပေးပါမည်။',
  locationOnlyInPrivate: 'ကျွန်ုပ်နှင့် တစ်ဦးချင်းချက်တွင် တည်နေရာ ပို့ပါ။ အနီးဆုံးနေရာများကို ရှာပေးပါမည်။',
  nearYou: 'သင့်အနီး',
  nearYouEmpty: 'သင့်အနီးတွင် ဘာမှ မတွေ့ပါ။',
  nearest: (count: number) => `အနီးဆုံး နေရာ ${count} ခု`,
  allCategories: 'အားလုံး',
  locationKept: 'သင့်တည်နေရာကို ဤရှာဖွေမှုအတွက်သာ အသုံးပြုပြီး သိမ်းဆည်းမထားပါ။',

  prev: '« ရှေ့',
  next: 'နောက် »',
  back: '← နောက်သို့',
  home: '⌂ အမျိုးအစားများ',
  map: '📍 မြေပုံ',
  website: '🌐 ဝက်ဘ်ဆိုက်',
  nearbyButton: '📍 အနီးအနား',
  nearPhrase: 'အနီးအနား',

  price: 'ဈေးနှုန်း',
  priceLevels: ['သက်သာ', 'အလယ်အလတ်', 'ဈေးကြီး'] as readonly string[],
  perPerson: 'တစ်ဦးလျှင်',
  money: (amount: number) => `${amount.toLocaleString('en-US')} ကျပ်`,
  priceFrom: (amount: string) => `${amount} မှ စ၍`,
  priceUpTo: (amount: string) => `${amount} အထိ`,

  amenities: 'ဤနေရာတွင် ရရှိနိုင်သည်',

  ratingLabel: 'အဆင့်သတ်မှတ်ချက်',
  ratingCount: (count: number) => `အဆင့်သတ်မှတ်ချက် ${count} ခု`,
  distance: (meters: number) =>
    meters < 1000 ? `${meters} မီတာ` : `${(meters / 1000).toFixed(1)} ကီလိုမီတာ`,
  places: () => 'နေရာ',
}

const LOCALES: Record<string, Partial<Strings>> = { en, my }

export function strings(lang: string): Strings {
  return { ...en, ...(LOCALES[lang] ?? {}) }
}

/** Weekday labels, in the order the keyboard and hours block render them. */
export const DAY_LABELS: Record<string, Record<string, string>> = {
  en: { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' },
  // Myanmar has no customary short forms for weekdays; the full names are used.
  my: { mon: 'တနင်္လာ', tue: 'အင်္ဂါ', wed: 'ဗုဒ္ဓဟူး', thu: 'ကြာသပတေး', fri: 'သောကြာ', sat: 'စနေ', sun: 'တနင်္ဂနွေ' },
}

export function dayLabels(lang: string): Record<string, string> {
  return DAY_LABELS[lang] ?? DAY_LABELS.en!
}
