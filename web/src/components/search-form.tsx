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
        className={`w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] ${compact ? 'py-1.5' : 'py-2.5'}`}
      />
      {!compact && (
        <button
          type="submit"
          className="rounded-md bg-[var(--color-accent)] px-4 text-sm font-medium text-white dark:text-black"
        >
          {text.search}
        </button>
      )}
    </form>
  )
}
