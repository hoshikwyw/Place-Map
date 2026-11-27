import type { Category } from '@place-map/shared'
import { t, type Locale } from '@/lib/i18n'
import { CategoryChips } from './category-chips'
import { SearchForm } from './search-form'

/**
 * The home banner: one job, finding a place, done two ways - typing, or
 * picking a category.
 *
 * Centred, with the search pill as its middle and the categories directly
 * under it, so the first screen offers both without a scroll. It used to
 * share the panel with the app card, whose own filled button made two
 * primary actions side by side; the card now sits further down the page,
 * where it is a suggestion rather than a competitor (see the home page).
 *
 * The panel is warm white melting into peach, with two soft suns and a faint
 * dot grid (.hero-texture), so the page's ordinary ink and muted colours sit
 * on it at full contrast in both themes. The headline is the serif, with the
 * accented phrase in its italic - the one flourish on the page.
 */
export function Hero({ locale, categories }: { locale: Locale; categories: Category[] }) {
  const text = t(locale)

  return (
    <section
      className="surface relative mb-12 overflow-hidden rounded-[var(--brand-radius-xl)] border-[var(--color-accent)]/10 px-5 pb-7 pt-10 sm:mb-16 sm:px-12 sm:pb-12 sm:pt-16"
      style={{
        backgroundImage: 'linear-gradient(180deg, var(--color-banner-from) 30%, var(--color-banner-to))',
      }}
    >
      {/* Texture, not content: out of the accessibility tree. */}
      <div aria-hidden className="hero-texture pointer-events-none absolute inset-0" />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
        {/* A quiet pill with a dot: the headline is the loudest thing here. */}
        <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--color-accent)]/15 bg-[var(--color-surface)]/80 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-[var(--color-accent)] shadow-[var(--shadow-xs)] backdrop-blur-sm">
          <span aria-hidden className="size-1.5 rounded-full bg-[var(--color-highlight)]" />
          {text.hero.eyebrow}
        </p>

        {/* The page's one h1. The accented phrase is 4.6:1 or better on the
            panel's peach end. leading-tight rather than an arbitrary
            leading-[1.1]: an arbitrary value is written straight into the
            rule, where the Myanmar line-height overrides in globals.css
            cannot reach it. */}
        <h1 className="font-display text-balance text-[2.25rem] leading-tight sm:text-[3.5rem]">
          {text.hero.titleBefore}
          <em className="text-[var(--color-accent)]">{text.hero.titleAccent}</em>
          {text.hero.titleAfter}
        </h1>

        <p className="mt-4 max-w-lg text-pretty text-base text-[var(--color-muted)] sm:text-lg">{text.hero.body}</p>

        <div className="mt-6 w-full max-w-xl sm:mt-8">
          <SearchForm locale={locale} />
        </div>

        {/* Browsing, for whoever would rather not type. Every category, in
            centred rows - this replaces the strip that used to sit under the
            hero, so the list appears once. */}
        <div className="mt-5 w-full sm:mt-6">
          <CategoryChips categories={categories} locale={locale} allHref={`/${locale}#all-places`} layout="wrap" />
        </div>
      </div>
    </section>
  )
}
