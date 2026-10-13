import { t, type Locale } from '@/lib/i18n'

/**
 * A plain GET form. No client JS: it works before hydration, the query ends up
 * in a shareable URL, and the results page renders on the server like
 * everything else.
 *
 * Deliberately not `required`: submitting an empty box is how someone goes
 * back to the full list, and the browser's "please fill out this field" popup
 * made that a dead end.
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
        // min-w-0 and flex-1 rather than w-full: in a flex row an input keeps
        // its intrinsic minimum width unless told otherwise, so next to a
        // shrink-0 button it refused to get smaller and the placeholder was
        // cut to "Search pla" on a 320px screen. The padding tightens there
        // too, which is another 16px of usable box.
        className={`min-w-0 flex-1 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-4 text-sm placeholder:text-[var(--color-muted)] transition focus:border-[var(--color-accent)] focus:outline-none focus:ring-4 focus:ring-[var(--color-accent-soft)] sm:px-5 ${compact ? 'py-2' : 'py-3'}`}
      />
      {!compact && (
        <button
          type="submit"
          className="shrink-0 whitespace-nowrap rounded-full bg-[var(--color-accent)] px-4 text-sm font-bold text-[var(--color-on-accent)] transition hover:opacity-90 active:scale-[0.98] sm:px-6"
        >
          {text.search}
        </button>
      )}
    </form>
  )
}
