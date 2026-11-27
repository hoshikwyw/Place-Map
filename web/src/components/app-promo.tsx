import { t, type Locale } from '@/lib/i18n'
import { InstallButton } from './install-button'
import { Logo } from './logo'

/**
 * The native app, as a slim band below the home page's list of places.
 *
 * It used to sit inside the hero, where its filled button stood beside the
 * search button as a second main action. Down here it is a suggestion for
 * someone who has already found the directory useful - which is the moment
 * an app is worth offering.
 *
 * Until the app is on the stores there is nothing to link to, so it says so
 * rather than offering a button that goes nowhere. Set APP_STORE_URL or
 * PLAY_STORE_URL and the line is replaced by real buttons - no code change,
 * and whichever store is missing simply does not appear.
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

  return (
    <aside
      className="surface promo-glow mt-16 flex flex-col items-center gap-5 p-6 text-center sm:flex-row sm:gap-6 sm:p-8 sm:text-left"
    >
      {/* The hero's light again, behind the mascot (.promo-glow):
          a glow that fades to nothing across the card, so the band belongs to
          the page instead of being the one plain white box on it.

          The one place the logo moves: a little life in a quiet band. */}
      <Logo size={72} bob className="shrink-0" />

      <div className="min-w-0 flex-1">
        <h2 className="font-display text-xl leading-snug">{text.appTitle}</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">{text.appBody}</p>
      </div>

      <div className="flex shrink-0 flex-col items-center gap-2 sm:items-end">
        {live ? (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {appStoreUrl && (
              <a href={appStoreUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                {text.appStore}
              </a>
            )}
            {playStoreUrl && (
              <a
                href={playStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={appStoreUrl ? 'btn btn-secondary' : 'btn btn-primary'}
              >
                {text.playStore}
              </a>
            )}
          </div>
        ) : (
          <>
            {/* Installing is real today, so it is offered. Only Chrome and the
                Android browsers can; elsewhere nothing renders here and the
                line below still says what is true. */}
            <InstallButton locale={locale} className="btn btn-secondary" />
            {/* A status, not a control: plain text with a dot. As a filled
                pill beside a button it looked pressable and did nothing. */}
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-muted)]">
              <span aria-hidden className="size-1.5 rounded-full bg-[var(--color-accent)]" />
              {text.appComingSoon}
            </p>
          </>
        )}
      </div>
    </aside>
  )
}
