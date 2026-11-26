import { t, type Locale } from '@/lib/i18n'
import { AppPromo } from './app-promo'
import { SearchForm } from './search-form'

/**
 * The home banner, from the brand sheet.
 *
 * The sheet's banner is a rounded panel: a washed gradient, a pill above the
 * headline, one word of the headline in the accent colour, and the app's store
 * buttons at the bottom. This is that, with the one thing a directory's home
 * page cannot do without in the middle of it - the search box.
 *
 * **It is a pale wash, not the logo's violet.** White on the logo's own
 * `gradientFrom` is 3.84:1, under the 4.5:1 body text needs, and the sheet's
 * own banner is dark text on light lavender for the same reason. Keeping the
 * panel light means the page's ordinary ink and muted colours sit on it, so it
 * cannot drift out of contrast when the palette moves. The ends are brand
 * tokens, so dark mode gets a deep violet version of the same idea rather than
 * a light panel punched into a dark page.
 */
export function Hero({
  locale,
  appStoreUrl,
  playStoreUrl,
}: {
  locale: Locale
  appStoreUrl?: string
  playStoreUrl?: string
}) {
  const text = t(locale)

  return (
    <section
      className="surface relative mb-14 overflow-hidden rounded-[var(--brand-radius-xl)] px-5 py-10 sm:px-12 sm:py-14"
      style={{
        backgroundImage:
          'linear-gradient(135deg, var(--color-banner-from) 30%, var(--color-banner-to))',
      }}
    >
      {/* The dot grid and glow - see .hero-texture. Behind everything, and
          out of the accessibility tree: it is texture, not content. */}
      <div aria-hidden className="hero-texture pointer-events-none absolute inset-0" />

      <div className="relative flex flex-col items-start gap-10 lg:flex-row lg:items-center lg:justify-between">
        {/* Order matters on a phone: the heading and the search box come
            first, and the app card follows them. */}
        <div className="w-full max-w-xl">
          {/* Quiet: a soft pill with a dot, not a filled accent badge. The
              headline is the loudest thing here, and the old solid pill
              competed with it. */}
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--color-accent)]/20 bg-[var(--color-accent-soft)] px-3.5 py-1.5 text-xs font-semibold tracking-wide text-[var(--color-accent)]">
            <span aria-hidden className="size-1.5 rounded-full bg-current" />
            {text.hero.eyebrow}
          </p>

          {/* The page's one h1. The accented word is 5.58:1 or better on the panel
              now that it is near-white - it was 3.8:1 on the old lavender
              wash, and only ever this large because of it. */}
          {/* leading-tight, not an arbitrary leading-[1.15]: an arbitrary value is
              written straight into the rule, so the Myanmar line-height
              overrides in globals.css cannot reach it - and at this size
              Myanmar's stacked marks from one line landed on the next. */}
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            {text.hero.titleBefore}
            <span className="text-[var(--color-accent)]">{text.hero.titleAccent}</span>
            {text.hero.titleAfter}
          </h1>

          <p className="mt-4 mb-7 max-w-lg text-lg text-[var(--color-muted)]">{text.hero.body}</p>

          <SearchForm locale={locale} />
        </div>

        <AppPromo locale={locale} appStoreUrl={appStoreUrl} playStoreUrl={playStoreUrl} />
      </div>
    </section>
  )
}
