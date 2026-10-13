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
          // lang, so the browser picks the right font for the name and - on an
          // English page - so the Myanmar line-height rules in globals.css
          // reach it. Without it "မြန်မာ" was set in Latin leading and its
          // stacked marks were clipped by the pill around it.
          lang={locale}
          className={
            locale === current
              ? 'whitespace-nowrap rounded-full bg-[var(--color-accent-soft)] px-3 py-1.5 text-xs font-bold text-[var(--color-accent)] sm:py-1'
              : 'whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold text-[var(--color-muted)] transition hover:text-[var(--color-ink)] sm:py-1'
          }
        >
          {/* The full name everywhere now: the phone header had no room for it,
              the menu it opens into has. */}
          {t(locale).language}
        </Link>
      ))}
    </nav>
  )
}
