import Link from 'next/link'
import { NavLink } from './nav-link'
import { Glyph } from './icons'
import { SavedLink } from './saved-link'
import { Suspense } from 'react'
import { t, type Locale } from '@/lib/i18n'
import { LanguageSwitcher } from './language-switcher'
import { ThemeToggle } from './theme-toggle'
import { Logo } from './logo'
import { HeaderSearch } from './header-search'
import { MobileMenu } from './mobile-menu'

export function Header({ locale }: { locale: Locale }) {
  const text = t(locale)

  return (
    // Sticky from `lg` up, where the header is one row of a known height
    // (--header-h in globals.css). Below that it can wrap - on a phone the
    // search box always takes a second row, and between `sm` and `lg` a
    // Myanmar page with saved places runs out of width. Pinning a two-row
    // header would hide a sixth of the screen for the whole visit, so there
    // it scrolls away with the page.
    //
    // z-30: above the page, below the assistant (z-40) and the skip link
    // (z-50). The canvas behind it is slightly see-through so the page reads
    // as passing underneath rather than being cut off at a hard edge.
    <header className="relative z-30 border-b border-[var(--color-line)] bg-[var(--color-canvas)]/90 backdrop-blur-md lg:sticky lg:top-0">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 lg:h-[var(--header-h)] lg:flex-nowrap lg:py-0">
        <Link
          href={`/${locale}`}
          className="order-1 flex shrink-0 items-center gap-2 text-base font-bold tracking-tight sm:order-none sm:text-lg"
        >
          <Logo size={30} className="sm:size-8" />
          {text.siteName}
        </Link>

        {/* Empty on the home page, where the hero carries search instead.
            Stays out of the menu on purpose: searching is the thing people
            came to do, and it should not take two taps. */}
        <div className="order-3 w-full empty:hidden sm:order-none sm:ml-6 sm:w-auto sm:flex-1">
          <HeaderSearch locale={locale} />
        </div>

        <MobileMenu labels={{ open: text.menu, close: text.menuClose }}>
          {/* Full-width rows on a phone, so the whole line is the tap target
              rather than the few characters of the word. */}
          <NavLink
            href={`/${locale}/map`}
            className="btn btn-ghost shrink-0 justify-start px-3 sm:justify-center"
          >
            <Glyph name="explore" size={17} />
            {text.map}
          </NavLink>

          {/* useSearchParams in a statically rendered tree must sit under a
              Suspense boundary, or the whole page opts out of static rendering. */}
          <SavedLink locale={locale} label={text.saved} />

          <div className="mt-1 flex shrink-0 items-center justify-between gap-1.5 border-t border-[var(--color-line)] px-1 pt-2.5 sm:mt-0 sm:justify-start sm:gap-2 sm:border-0 sm:px-0 sm:pt-0">
            <Suspense fallback={null}>
              <LanguageSwitcher current={locale} />
            </Suspense>
            <ThemeToggle
              labels={{
                theme: text.theme,
                light: text.themeLight,
                dark: text.themeDark,
              }}
            />
          </div>
        </MobileMenu>
      </div>
    </header>
  )
}
