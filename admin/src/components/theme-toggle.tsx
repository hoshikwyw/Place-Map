'use client'

import { useEffect, useState } from 'react'

/**
 * Light / dark / system, remembered in this browser.
 *
 * "System" is the default and a real third option, not a trick: most people
 * want the site to follow the phone's evening switch, and only some want to
 * pin it. A pinned choice writes `data-theme` on <html>, which brand.css reads;
 * clearing it hands control back to `prefers-color-scheme`.
 *
 * The choice is applied by THEME_SCRIPT in the document head, before anything
 * paints, so a dark-mode visitor never sees a white flash on the way in.
 */

export type ThemeChoice = 'light' | 'dark' | 'system'

export const THEME_STORAGE_KEY = 'place-map-theme'

/**
 * Inlined into <head>, so it runs before the first paint. Deliberately tiny and
 * dependency-free; a failure (private mode, storage blocked) leaves the system
 * theme in place rather than breaking the page.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='dark'||t==='light'){document.documentElement.dataset.theme=t}}catch(e){}})()`

function apply(choice: ThemeChoice) {
  const root = document.documentElement
  if (choice === 'system') delete root.dataset.theme
  else root.dataset.theme = choice

  try {
    if (choice === 'system') localStorage.removeItem(THEME_STORAGE_KEY)
    else localStorage.setItem(THEME_STORAGE_KEY, choice)
  } catch {
    // Storage can be blocked. The page is already correct; it just will not
    // be remembered next time.
  }
}

export interface ThemeLabels {
  theme: string
  light: string
  dark: string
  system: string
}

const ICONS: Record<ThemeChoice, React.ReactNode> = {
  light: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
    </>
  ),
  dark: <path d="M20 13.5A8 8 0 1 1 10.5 4a6.5 6.5 0 0 0 9.5 9.5Z" />,
  system: (
    <>
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21h8" />
    </>
  ),
}

const ORDER: ThemeChoice[] = ['system', 'light', 'dark']

export function ThemeToggle({ labels }: { labels: ThemeLabels }) {
  // Null until mounted: the server cannot know which option is stored, and
  // guessing would make the pressed state flip after hydration.
  const [choice, setChoice] = useState<ThemeChoice | null>(null)

  useEffect(() => {
    let stored: string | null = null
    try {
      stored = localStorage.getItem(THEME_STORAGE_KEY)
    } catch {
      // Treated as no choice.
    }
    setChoice(stored === 'dark' || stored === 'light' ? stored : 'system')
  }, [])

  const select = (next: ThemeChoice) => {
    setChoice(next)
    apply(next)
  }

  return (
    <div
      role="group"
      aria-label={labels.theme}
      className="flex gap-0.5 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] p-1"
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
  )
}
