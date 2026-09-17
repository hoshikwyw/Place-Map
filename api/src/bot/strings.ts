/**
 * The bot's own chrome. Place data is translated in the database; these are the
 * words the bot supplies itself, and they have to match the language the API
 * was asked for or a screen ends up half in each.
 *
 * Add a locale here whenever you add one to SUPPORTED_LANGS. Missing keys fall
 * back to English rather than rendering blank.
 */

const en = {
  welcome: 'Choose a category, or type anything to search.',
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
}

type Strings = typeof en

const my: Partial<Strings> = {
  welcome: 'အမျိုးအစားတစ်ခု ရွေးပါ၊ သို့မဟုတ် ရှာဖွေရန် စာရိုက်ပါ။',
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
