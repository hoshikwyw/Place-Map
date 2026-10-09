'use client'

import { useEffect, useState } from 'react'
import { storageWorks, useSaved } from '@/lib/saved'
import { t, type Locale } from '@/lib/i18n'

/**
 * Keeps a place, or lets it go.
 *
 * Nothing is drawn until the component knows two things the server cannot:
 * whether this device can store anything at all, and whether this place is
 * already saved. Rendering a hollow heart first and filling it in on hydration
 * would flicker on every saved place in a list.
 */
export function SaveButton({
  id,
  locale,
  variant = 'icon',
}: {
  id: number
  locale: Locale
  /** `icon` sits on a card; `full` is the labelled button on a place page. */
  variant?: 'icon' | 'full'
}) {
  const text = t(locale)
  const { ready, has, toggle } = useSaved()
  const [canStore, setCanStore] = useState(true)

  useEffect(() => setCanStore(storageWorks()), [])

  // A button that silently forgets is worse than no button.
  if (!ready || !canStore) return null

  const saved = has(id)
  const label = saved ? text.savedRemove : text.savedAdd

  return (
    <button
      type="button"
      onClick={(event) => {
        // On a card the whole tile is a link to the place.
        event.preventDefault()
        event.stopPropagation()
        toggle(id)
      }}
      aria-pressed={saved}
      aria-label={variant === 'icon' ? label : undefined}
      title={variant === 'icon' ? label : undefined}
      className={
        variant === 'icon'
          ? 'inline-flex size-9 items-center justify-center rounded-full bg-[var(--color-surface)]/90 text-[var(--color-ink)] shadow-sm backdrop-blur-sm transition hover:scale-110 active:scale-95'
          : 'inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-bold transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]'
      }
    >
      <Heart filled={saved} />
      {variant === 'full' && label}
    </button>
  )
}

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={filled ? 'text-[var(--color-danger)]' : ''}
    >
      <path d="M19.5 12.6 12 20l-7.5-7.4a4.6 4.6 0 0 1 0-6.5 4.6 4.6 0 0 1 6.5 0l1 1 1-1a4.6 4.6 0 0 1 6.5 0 4.6 4.6 0 0 1 0 6.5z" />
    </svg>
  )
}
