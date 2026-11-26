'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useSaved } from '@/lib/saved'
import { Glyph } from './icons'

/**
 * The way back to the saved list, with how many are waiting.
 *
 * Hidden until something is saved. A nav item that says "Saved 0" on every
 * first visit is a permanent advertisement for a feature nobody has used yet;
 * the hearts on the cards are the invitation.
 */
export function SavedLink({ locale, label }: { locale: string; label: string }) {
  const { ready, count } = useSaved()
  // Read before the early return: hooks run in the same order every render.
  const current = usePathname().replace(/\/$/, '') === `/${locale}/saved`

  if (!ready || count === 0) return null

  return (
    <Link
      href={`/${locale}/saved`}
      aria-current={current ? 'page' : undefined}
      className="btn btn-ghost shrink-0 justify-start px-3 sm:justify-center"
    >
      <Glyph name="saved" size={17} />
      {label}
      <span className="ml-1.5 rounded-full bg-[var(--color-accent-soft)] px-1.5 py-0.5 text-xs text-[var(--color-accent)]">
        {count}
      </span>
    </Link>
  )
}
