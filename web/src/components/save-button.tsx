'use client'

import { useEffect, useState } from 'react'
import { storageWorks, useSaved } from '@/lib/saved'
import { GLYPHS, STROKE } from './icons'
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
          ? // 44px to tap, 36px drawn: the extra is clear space around the
            // disc (and the -m-1 keeps it from moving), so a thumb that lands
            // just off the heart still hits it, and the photo is covered no
            // more than before.
            'group/save -m-1 inline-flex size-11 items-center justify-center rounded-full'
          : 'btn btn-secondary whitespace-normal px-4 text-center'
      }
    >
      {variant === 'icon' ? (
        <span className="inline-flex size-9 items-center justify-center rounded-full bg-[var(--color-surface)]/90 text-[var(--color-ink)] shadow-sm backdrop-blur-sm transition group-active/save:scale-90 [@media(hover:hover)]:group-hover/save:scale-110">
          <Heart filled={saved} />
        </span>
      ) : (
        <Heart filled={saved} />
      )}
      {variant === 'full' && label}
    </button>
  )
}

/**
 * The brand set's heart, filled when the place is kept.
 *
 * The outline and the fill are one path, so the two states are the same shape
 * and the heart does not appear to change size when it is tapped.
 */
function Heart({ filled }: { filled: boolean }) {
  return (
    <svg
      {...STROKE}
      width={18}
      height={18}
      fill={filled ? 'currentColor' : 'none'}
      className={filled ? 'shrink-0 text-[var(--color-danger)]' : 'shrink-0'}
    >
      {GLYPHS.saved}
    </svg>
  )
}
