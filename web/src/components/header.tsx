import Link from 'next/link'
import { Suspense } from 'react'
import { t, type Locale } from '@/lib/i18n'
import { LanguageSwitcher } from './language-switcher'
import { ThemeToggle } from './theme-toggle'
import { Logo } from './logo'
import { HeaderSearch } from './header-search'

export function Header({ locale }: { locale: Locale }) {
  const text = t(locale)

  return (
    <header className="border-b border-[var(--color-line)]">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:py-3">
        <Link
          href={`/${locale}`}
          className="flex shrink-0 items-center gap-2 text-base font-bold tracking-tight sm:text-lg"
        >
          <Logo size={30} className="sm:size-8" />
          {text.siteName}
        </Link>

        {/* Empty on the home page, where the hero carries search instead. */}
        <div className="order-3 w-full empty:hidden sm:order-none sm:ml-6 sm:w-auto sm:flex-1">
          <HeaderSearch locale={locale} />
        </div>

        {/* useSearchParams in a statically rendered tree must sit under a
            Suspense boundary, or the whole page opts out of static rendering. */}
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Suspense fallback={null}>
            <LanguageSwitcher current={locale} />
          </Suspense>
          <ThemeToggle
            labels={{
              theme: text.theme,
              light: text.themeLight,
              dark: text.themeDark,
              system: text.themeSystem,
            }}
          />
        </div>
      </div>
    </header>
  )
}
