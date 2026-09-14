import { t, type Locale } from '@/lib/i18n'

/**
 * A plain GET form. No client JS: it works before hydration, the query ends up
 * in a shareable URL, and the results page renders on the server like
 * everything else.
 */
export function SearchForm({
  locale,
  defaultValue = '',
  compact = false,
}: {
  locale: Locale
  defaultValue?: string
  compact?: boolean
}) {
  const text = t(locale)

  return (
    <form action={`/${locale}/search`} method="get" role="search" className="flex gap-2">
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={text.searchPlaceholder}
        aria-label={text.search}
        minLength={2}
        required
        className={`w-full rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-5 text-sm placeholder:text-[var(--color-muted)] transition focus:border-[var(--color-accent)] focus:outline-none focus:ring-4 focus:ring-[var(--color-accent-soft)] ${compact ? 'py-2' : 'py-3'}`}
      />
      {!compact && (
        <button
          type="submit"
          className="rounded-full bg-[var(--color-accent)] px-6 text-sm font-bold text-[var(--color-on-accent)] transition hover:opacity-90 active:scale-[0.98]"
        >
          {text.search}
        </button>
      )}
    </form>
  )
}
