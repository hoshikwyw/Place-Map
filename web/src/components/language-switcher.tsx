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
      className="flex gap-1 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] p-1"
    >
      {LOCALES.map((locale) => (
        <Link
          key={locale}
          href={hrefFor(locale)}
          hrefLang={locale}
          aria-current={locale === current ? 'true' : undefined}
          className={
            locale === current
              ? 'rounded-full bg-[var(--color-accent-soft)] px-3 py-1 text-xs font-bold text-[var(--color-accent)]'
              : 'rounded-full px-3 py-1 text-xs font-semibold text-[var(--color-muted)] transition hover:text-[var(--color-ink)]'
          }
        >
          {t(locale).language}
        </Link>
      ))}
    </nav>
  )
}
