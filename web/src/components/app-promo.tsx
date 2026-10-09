import { t, type Locale } from '@/lib/i18n'
import { InstallButton } from './install-button'
import { Logo } from './logo'

/**
 * The native app, promoted beside the hero on the home page.
 *
 * Until the app is on the stores there is nothing to link to, so it says so
 * rather than offering a button that goes nowhere. Set APP_STORE_URL or
 * PLAY_STORE_URL and the sentence is replaced by real buttons - no code change,
 * and whichever store is missing simply does not appear.
 *
 * Deliberately a card rather than a strip across the top: a bar above the
 * header pushes every page down for something only some visitors want, and it
 * is the first thing a search engine reads on every page.
 */
export function AppPromo({
  locale,
  appStoreUrl,
  playStoreUrl,
}: {
  locale: Locale
  appStoreUrl?: string
  playStoreUrl?: string
}) {
  const text = t(locale)
  const live = Boolean(appStoreUrl || playStoreUrl)

  const button =
    'rounded-full px-4 py-2 text-sm font-bold transition whitespace-nowrap bg-[var(--color-accent)] text-[var(--color-on-accent)] hover:opacity-90'
  const secondary =
    'rounded-full border border-[var(--color-line)] px-4 py-2 text-sm font-bold transition whitespace-nowrap hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]'

  return (
    <aside className="w-full max-w-sm rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6 text-center sm:shrink-0">
      {/* The one place the logo moves: it is the page's welcome. */}
      <Logo size={96} bob className="mx-auto mb-4" />

      <h2 className="mb-1.5 text-lg font-bold leading-snug">{text.appTitle}</h2>
      <p className="mb-4 text-sm text-[var(--color-muted)]">{text.appBody}</p>

      {live ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {appStoreUrl && (
            <a href={appStoreUrl} target="_blank" rel="noopener noreferrer" className={button}>
              {text.appStore}
            </a>
          )}
          {playStoreUrl && (
            <a
              href={playStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={appStoreUrl ? secondary : button}
            >
              {text.playStore}
            </a>
          )}
        </div>
      ) : (
        <>
          {/* Installing is real today, so it is offered first. Only Chrome and
              the Android browsers can; on an iPhone nothing renders here and
              the sentence below is still true. */}
          <InstallButton locale={locale} className={button} />
          <p className="mt-2 inline-block rounded-full bg-[var(--color-accent-soft)] px-4 py-2 text-sm font-bold text-[var(--color-accent)]">
            {text.appComingSoon}
          </p>
        </>
      )}
    </aside>
  )
}
