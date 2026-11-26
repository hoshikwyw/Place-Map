import { t, type Locale } from '@/lib/i18n'
import { Glyph } from './icons'

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

  if (compact) {
    return (
      <form action={`/${locale}/search`} method="get" role="search" className="flex">
        <input
          type="search"
          name="q"
          defaultValue={defaultValue}
          placeholder={text.searchPlaceholder}
          aria-label={text.search}
          // min-w-0 and flex-1 rather than w-full: in a flex row an input
          // keeps its intrinsic minimum width unless told otherwise.
          className="surface min-h-10 min-w-0 flex-1 rounded-[var(--brand-radius-md)] px-4 text-sm placeholder:text-[var(--color-muted)] transition focus:border-[var(--color-accent)] focus:outline-none focus:ring-4 focus:ring-[var(--color-accent-soft)] sm:px-5"
        />
      </form>
    )
  }

  /*
   * The full box is one control: a pill with the icon, the field and the
   * button inside it. As two shapes side by side - a box and a button - it
   * read as a form; as one, it reads as the thing the page is for.
   *
   * The ring goes on the pill (focus-within), not the field, so focus shows
   * around the whole control. The field's own outline is off for the same
   * reason; the ring is the focus indicator, at 4px and in the accent.
   */
  return (
    <form
      action={`/${locale}/search`}
      method="get"
      role="search"
      className="surface surface-raised flex w-full items-center gap-1 rounded-[var(--brand-radius-lg)] p-1.5 pl-4 transition focus-within:border-[var(--color-accent)] focus-within:ring-4 focus-within:ring-[var(--color-accent-soft)] sm:pl-5"
    >
      <Glyph name="search" size={20} className="text-[var(--color-muted)]" />
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={text.searchPlaceholder}
        aria-label={text.search}
        // min-w-0: without it the field kept its intrinsic width and pushed
        // the button out of the pill on a 320px screen.
        className="min-h-11 min-w-0 flex-1 bg-transparent px-2 text-base placeholder:text-[var(--color-muted)] focus:outline-none"
      />
      <button type="submit" className="btn btn-primary shrink-0 px-5 sm:px-6">
        {text.search}
      </button>
    </form>
  )
}
