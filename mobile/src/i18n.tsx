import AsyncStorage from '@react-native-async-storage/async-storage'
import { getLocales } from 'expo-localization'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { Weekday } from '@place-map/shared'

/**
 * Same locales and wording as the web app (web/src/lib/i18n.ts). Place data is
 * translated in the database and arrives already in the chosen language; these
 * are the words the app supplies itself.
 */

export const LOCALES = ['en', 'uz'] as const
export type Locale = (typeof LOCALES)[number]
const DEFAULT_LOCALE: Locale = 'en'

const isLocale = (value: string | null | undefined): value is Locale =>
  !!value && (LOCALES as readonly string[]).includes(value)

const en = {
  appName: 'Place Map',
  tagline: 'Cafes, restaurants, parks and more - with hours, photos and directions.',
  switchTo: 'O‘zbekcha',
  categories: 'Categories',
  search: 'Search',
  searchPlaceholder: 'Search places…',
  noResults: (q: string) => `Nothing found for “${q}”.`,
  queryTooShort: 'Type at least 2 characters.',
  places: (n: number) => (n === 1 ? '1 place' : `${n} places`),
  emptyCategory: 'Nothing here yet.',
  openNow: 'Open now',
  closesAt: (time: string) => `Closes ${time}`,
  closedNow: 'Closed now',
  hours: 'Opening hours',
  closed: 'Closed',
  address: 'Address',
  call: 'Call',
  website: 'Website',
  directions: 'Directions',
  notFoundTitle: 'Not found',
  notFoundBody: 'This place is no longer listed.',
  errorTitle: 'Something went wrong',
  errorBody: 'This could not be loaded. Check your connection and try again.',
  tryAgain: 'Try again',
  staleNotice: 'Showing saved data - could not refresh.',
  days: { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' },
}

type Dictionary = typeof en

const uz: Dictionary = {
  appName: 'Place Map',
  tagline: 'Kafelar, restoranlar, bog‘lar va boshqalar - ish vaqti, rasmlar va yo‘nalish bilan.',
  switchTo: 'English',
  categories: 'Toifalar',
  search: 'Qidirish',
  searchPlaceholder: 'Joylarni qidiring…',
  noResults: (q: string) => `“${q}” bo‘yicha hech narsa topilmadi.`,
  queryTooShort: 'Kamida 2 ta belgi kiriting.',
  places: (n: number) => `${n} ta joy`,
  emptyCategory: 'Bu yerda hozircha hech narsa yo‘q.',
  openNow: 'Hozir ochiq',
  closesAt: (time: string) => `${time} da yopiladi`,
  closedNow: 'Hozir yopiq',
  hours: 'Ish vaqti',
  closed: 'Yopiq',
  address: 'Manzil',
  call: 'Qo‘ng‘iroq',
  website: 'Veb-sayt',
  directions: 'Yo‘nalish',
  notFoundTitle: 'Topilmadi',
  notFoundBody: 'Bu joy endi ro‘yxatda emas.',
  errorTitle: 'Xatolik yuz berdi',
  errorBody: 'Yuklab bo‘lmadi. Internetni tekshirib, qayta urinib ko‘ring.',
  tryAgain: 'Qayta urinish',
  staleNotice: 'Saqlangan ma’lumot ko‘rsatilmoqda - yangilab bo‘lmadi.',
  days: { mon: 'Du', tue: 'Se', wed: 'Ch', thu: 'Pa', fri: 'Ju', sat: 'Sh', sun: 'Ya' },
}

const DICTIONARIES: Record<Locale, Dictionary> = { en, uz }

export function dayLabel(locale: Locale, day: Weekday): string {
  return DICTIONARIES[locale].days[day]
}

// ------------------------------------------------------------------ provider

const STORAGE_KEY = 'place-map:locale'

/** The phone's own language when it is one we support, otherwise English. */
function deviceLocale(): Locale {
  const code = getLocales()[0]?.languageCode
  return isLocale(code) ? code : DEFAULT_LOCALE
}

interface I18n {
  locale: Locale
  text: Dictionary
  toggle: () => void
}

const Context = createContext<I18n | null>(null)

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale | null>(null)

  // A choice made in the app outlives the phone's setting. Read it before the
  // first render, so the first screen does not flash in the wrong language.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => setLocale(isLocale(saved) ? saved : deviceLocale()))
      .catch(() => setLocale(deviceLocale()))
  }, [])

  const toggle = useCallback(() => {
    setLocale((current) => {
      const next: Locale = current === 'uz' ? 'en' : 'uz'
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {})
      return next
    })
  }, [])

  const value = useMemo(
    () => (locale ? { locale, text: DICTIONARIES[locale], toggle } : null),
    [locale, toggle],
  )

  // Storage answers in a few milliseconds; rendering nothing that long is
  // better than rendering the wrong language and switching under the user.
  if (!value) return null
  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useI18n(): I18n {
  const value = useContext(Context)
  if (!value) throw new Error('useI18n must be used inside <LocaleProvider>')
  return value
}
