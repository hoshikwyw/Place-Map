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
      className="mb-14 overflow-hidden rounded-[var(--brand-radius-xl)] border border-[var(--color-line)] px-6 py-10 sm:px-10 sm:py-12"
      style={{
        backgroundImage:
          'linear-gradient(120deg, var(--color-banner-from), var(--color-banner-to))',
      }}
    >
      <div className="flex flex-col items-start gap-10 lg:flex-row lg:items-center lg:justify-between">
        {/* Order matters on a phone: the heading and the search box come
            first, and the app card follows them. */}
        <div className="w-full max-w-xl">
          <p className="mb-4 inline-block rounded-full bg-[var(--color-accent)] px-4 py-1.5 text-xs font-bold tracking-wide text-[var(--color-on-accent)]">
            {text.hero.eyebrow}
          </p>

          {/* The page's one h1. The accented word is only ever this large:
              against the wash it is 3.8:1, which carries large text and would
              not carry a sentence. */}
          <h1 className="text-4xl font-bold leading-[1.15] tracking-tight sm:text-5xl">
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
