'use client'

import { useEffect, useState } from 'react'

/**
 * Light or dark, remembered in this browser.
 *
 * A first visit still follows the device: nothing is stored, so brand.css's
 * `prefers-color-scheme` rule decides, and the toggle simply highlights
 * whichever of the two is in effect. Pressing either one pins it by writing
 * `data-theme` on <html>, which overrides that rule in both directions.
 *
 * The stored choice is applied by THEME_SCRIPT in the document head, before
 * anything paints, so a dark-mode visitor never sees a white flash on the way
 * in.
 */

export type ThemeChoice = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'place-map-theme'

/**
 * Inlined into <head>, so it runs before the first paint. Deliberately tiny and
 * dependency-free; a failure (private mode, storage blocked) leaves the device
 * theme in place rather than breaking the page.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='dark'||t==='light'){document.documentElement.dataset.theme=t}}catch(e){}})()`

/** Puts the choice on <html>, where brand.css reads it. */
function applyTheme(choice: ThemeChoice) {
  if (document.documentElement.dataset.theme !== choice) {
    document.documentElement.dataset.theme = choice
  }
}

function remember(choice: ThemeChoice) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, choice)
  } catch {
    // Storage can be blocked. The page is already correct; it just will not
    // be remembered next time.
  }
}

function stored(): ThemeChoice | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY)
    return value === 'dark' || value === 'light' ? value : null
  } catch {
    return null
  }
}

export interface ThemeLabels {
  theme: string
  light: string
  dark: string
}

const ICONS: Record<ThemeChoice, React.ReactNode> = {
  light: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
    </>
  ),
  dark: <path d="M20 13.5A8 8 0 1 1 10.5 4a6.5 6.5 0 0 0 9.5 9.5Z" />,
}

const ORDER: ThemeChoice[] = ['light', 'dark']

export function ThemeToggle({ labels }: { labels: ThemeLabels }) {
  // Null until mounted: the server cannot know what this browser stored, or
  // what its device prefers, and guessing would make the state flip after
  // hydration.
  const [choice, setChoice] = useState<ThemeChoice | null>(null)

  useEffect(() => {
    const saved = stored()

    if (saved) {
      setChoice(saved)
      // Re-apply, do not just read: switching language re-renders <html lang>,
      // and that drops the data-theme attribute the pre-paint script set. The
      // page would then fall back to the device theme while storage still said
      // otherwise - which looked like changing language changed the theme.
      applyTheme(saved)
      return
    }

    // Nothing stored: show whichever the device is giving them, without
    // storing it - they have not chosen yet, and the page should keep
    // following the device until they do.
    setChoice(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  }, [])

  const select = (next: ThemeChoice) => {
    setChoice(next)
    applyTheme(next)
    remember(next)
  }

  // A phone header has no room for a pair of buttons beside a language
  // switcher, so there it becomes one that swaps between the two.
  const current = choice ?? 'light'
  const other: ThemeChoice = current === 'dark' ? 'light' : 'dark'

  return (
    <>
      <button
        type="button"
        onClick={() => select(other)}
        aria-label={`${labels.theme}: ${labels[current]}. ${labels[other]}`}
        title={labels[other]}
        className="flex size-9 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-muted)] transition hover:text-[var(--color-ink)] sm:hidden"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4"
        >
          {ICONS[current]}
        </svg>
      </button>

      <div
        role="group"
        aria-label={labels.theme}
        className="hidden gap-0.5 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] p-1 sm:flex"
      >
        {ORDER.map((option) => {
          const active = choice === option
          return (
            <button
              key={option}
              type="button"
              onClick={() => select(option)}
              aria-pressed={active}
              title={labels[option]}
              className={`flex size-7 items-center justify-center rounded-full transition ${
                active
                  ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4"
              >
                {ICONS[option]}
              </svg>
              <span className="sr-only">{labels[option]}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}
