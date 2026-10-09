'use client'

import Link from 'next/link'
import { useSaved } from '@/lib/saved'

/**
 * The way back to the saved list, with how many are waiting.
 *
 * Hidden until something is saved. A nav item that says "Saved 0" on every
 * first visit is a permanent advertisement for a feature nobody has used yet;
 * the hearts on the cards are the invitation.
 */
export function SavedLink({ locale, label }: { locale: string; label: string }) {
  const { ready, count } = useSaved()

  if (!ready || count === 0) return null

  return (
    <Link
      href={`/${locale}/saved`}
      className="shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-sm font-bold text-[var(--color-muted)] transition hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)]"
    >
      {label}
      <span className="ml-1.5 rounded-full bg-[var(--color-accent-soft)] px-1.5 py-0.5 text-xs text-[var(--color-accent)]">
        {count}
      </span>
    </Link>
  )
}
