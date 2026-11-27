import type { Category } from '@place-map/shared'
import { t, type Locale } from '@/lib/i18n'
import { CategoryChips } from './category-chips'
import { SearchForm } from './search-form'

/**
 * The home banner: one job, finding a place, done two ways - typing, or
 * picking a category.
 *
 * Not a box. It used to be a bordered card with a peach-to-brown gradient, a
 * dot grid and two glows; on a phone that read as a heavy slab inset from the
 * screen edges, and in the dark theme the gradients blended through a muddy
 * brown. Directory products put search straight on the page and let the
 * ground do the framing, so this is now an open band:
 *
 *  - One warm glow at the top (.hero-glow), drawn edge to edge of the
 *    viewport and fading to nothing, so the band has no edge to look boxed.
 *    Each glow fades to transparent rather than to another colour, which is
 *    what keeps it from passing through brown.
 *  - Four things, in order of weight: the serif headline, one line under it,
 *    the search box - the brightest surface on the screen, because it is the
 *    action - and the categories, sliding edge to edge on a phone.
 *  - The eyebrow is plain accent text now, not a pill: a fifth shape
 *    competing with the headline.
 */
export function Hero({ locale, categories }: { locale: Locale; categories: Category[] }) {
  const text = t(locale)

  return (
    // -mt-10 pulls the band up under main's top padding, so the glow starts
    // right below the header instead of after a strip of plain page.
    <section className="relative -mt-10 mb-12 pb-2 pt-12 sm:mb-16 sm:pt-20">
      {/* Decoration: full viewport width, behind the content. The body clips
          horizontal overflow (layout.tsx), so 100vw never adds a scrollbar. */}
      <div
        aria-hidden
        className="hero-glow pointer-events-none absolute inset-y-0 left-1/2 w-screen -translate-x-1/2"
      />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
        <p className="mb-4 text-sm font-semibold text-[var(--color-accent)]">{text.hero.eyebrow}</p>

        {/* The page's one h1. leading-tight rather than an arbitrary
            leading-[1.1]: an arbitrary value is written straight into the
            rule, where the Myanmar line-height overrides in globals.css
            cannot reach it. */}
        <h1 className="font-display max-w-[16ch] text-balance text-[2.5rem] leading-tight sm:max-w-none sm:text-6xl">
          {text.hero.titleBefore}
          <em className="text-[var(--color-accent)]">{text.hero.titleAccent}</em>
          {text.hero.titleAfter}
        </h1>

        <p className="mt-4 max-w-md text-pretty text-base text-[var(--color-muted)] sm:mt-5 sm:max-w-lg sm:text-lg">
          {text.hero.body}
        </p>

        <div className="mt-7 w-full max-w-xl sm:mt-9">
          <SearchForm locale={locale} prominent />
        </div>

        {/* Browsing, for whoever would rather not type. A sliding strip that
            runs to the screen edges on a phone, centred rows from sm. */}
        <div className="mt-5 w-full sm:mt-6">
          <CategoryChips categories={categories} locale={locale} allHref={`/${locale}#all-places`} layout="wrap" />
        </div>
      </div>
    </section>
  )
}
