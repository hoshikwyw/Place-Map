'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { LOCALES, t, type Locale } from '@/lib/i18n'

/**
 * Swaps the locale prefix and keeps everything else, so switching language on a
 * place page lands on the same place - not back at the home page.
 */
export function LanguageSwitcher({ current }: { current: Locale }) {
  const pathname = usePathname()
  const search = useSearchParams().toString()

  const hrefFor = (locale: Locale) => {
    const rest = pathname.replace(/^\/[^/]+/, '')
    return `/${locale}${rest}${search ? `?${search}` : ''}`
  }

  return (
    <nav
      aria-label="Language"
      className="flex gap-0.5 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] p-1 sm:gap-1"
    >
      {LOCALES.map((locale) => (
        <Link
          key={locale}
          href={hrefFor(locale)}
          hrefLang={locale}
          aria-current={locale === current ? 'true' : undefined}
          className={
            locale === current
              ? 'whitespace-nowrap rounded-full bg-[var(--color-accent-soft)] px-2.5 py-2 text-xs font-bold sm:py-1 text-[var(--color-accent)] sm:px-3'
              : 'whitespace-nowrap rounded-full px-2.5 py-2 text-xs font-semibold sm:py-1 text-[var(--color-muted)] transition hover:text-[var(--color-ink)] sm:px-3'
          }
        >
          {/* The full name needs room the phone header does not have. */}
          <span className="sm:hidden">{t(locale).languageShort}</span>
          <span className="hidden sm:inline">{t(locale).language}</span>
        </Link>
      ))}
    </nav>
  )
}
