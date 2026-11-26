'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Glyph } from './icons'

/**
 * The footer's "know a place we are missing?" card - everywhere but the
 * suggest page itself, where it invited people to go where they already were.
 * A client component only to read the path: the footer lives in the layout,
 * which is shared by every page and cannot see which one it is under.
 */
export function FooterSuggest({ locale, prompt, action }: { locale: string; prompt: string; action: string }) {
  const href = `/${locale}/suggest`
  if (usePathname().replace(/\/$/, '') === href) return null

  return (
    <div className="flex flex-col items-start gap-3 rounded-[var(--brand-radius-lg)] bg-[var(--color-accent-soft)] p-5 sm:items-end sm:text-right">
      <p className="text-sm font-semibold text-[var(--color-ink)]">{prompt}</p>
      <Link href={href} className="btn btn-primary">
        <Glyph name="explore" size={17} />
        {action}
      </Link>
    </div>
  )
}
