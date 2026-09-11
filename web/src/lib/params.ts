import { notFound } from 'next/navigation'
import { isLocale, type Locale } from './i18n'

/**
 * Narrows the `[lang]` param, or 404s.
 *
 * The middleware guarantees a valid locale for ordinary paths, but it skips
 * anything with a dot in it, so `/foo.bar/c/cafes` reaches a page with
 * `lang = "foo.bar"`. Next renders pages alongside their layout, so relying on
 * the layout's check alone would still let the page call the API with a
 * nonsense language before the 404 won.
 */
export function requireLocale(value: string): Locale {
  if (!isLocale(value)) notFound()
  return value
}
