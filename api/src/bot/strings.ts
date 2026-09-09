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

const uz: Partial<Strings> = {
  welcome: 'Toifani tanlang yoki qidirish uchun yozing.',
  categories: 'Toifalar',
  noCategories: 'Hozircha toifalar yo‘q.',
  emptyCategory: 'Bu yerda hozircha hech narsa yo‘q.',
  notFound: 'Bu joy endi ro‘yxatda yo‘q.',
  searching: 'Qidirilmoqda…',
  noResults: (q: string) => `“${q}” bo‘yicha hech narsa topilmadi.`,
  moreResults: (shown: number, total: number) =>
    `${total} tadan ${shown} tasi ko‘rsatilmoqda. Aniqroq qidiring.`,
  queryTooShort: 'Qidirish uchun kamida 2 ta belgi kiriting.',
  closed: 'yopiq',
  hours: 'Ish vaqti',
  phone: 'Telefon',
  error: 'Xatolik yuz berdi. /start ni bosing.',
}

const LOCALES: Record<string, Partial<Strings>> = { en, uz }

export function strings(lang: string): Strings {
  return { ...en, ...(LOCALES[lang] ?? {}) }
}

/** Weekday labels, in the order the keyboard and hours block render them. */
export const DAY_LABELS: Record<string, Record<string, string>> = {
  en: { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' },
  uz: { mon: 'Du', tue: 'Se', wed: 'Ch', thu: 'Pa', fri: 'Ju', sat: 'Sh', sun: 'Ya' },
}

export function dayLabels(lang: string): Record<string, string> {
  return DAY_LABELS[lang] ?? DAY_LABELS.en!
}
