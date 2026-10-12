/**
 * The brand sheet's icons, drawn once.
 *
 * One line weight, one grid, one set of rounded ends, so a row of them reads
 * as a set rather than as nine drawings that happen to sit together. Every
 * icon is a 24-unit square, stroked rather than filled, and inherits
 * `currentColor` - which is what lets the same file be accent-coloured in a
 * chip and ink-coloured in a list without a second copy.
 *
 * Only the icons this directory has somewhere to put. The sheet also has
 * Friends and Profile; there are no accounts here, so there is nothing for
 * them to label, and an icon with no job is a thing to keep in step for
 * nothing.
 */

import type { ReactNode } from 'react'

/** The sheet's line: 1.8 on a 24 grid, round ends, round joins. */
export const STROKE = {
  'aria-hidden': true,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

/**
 * Keyed by what each one labels, not by what it draws: `cafes` rather than
 * `cup`. A category whose slug changes should lose its icon and fall back,
 * which is honest - an icon that keeps matching a renamed category is worse
 * than none.
 */
export const GLYPHS: Record<string, ReactNode> = {
  // Explore - the pin, and the fallback for a category with nothing else.
  explore: (
    <>
      <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.6" />
    </>
  ),

  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),

  // Saved - the heart, drawn as one closed stroke so it can also be filled.
  saved: <path d="M12 20.2 4.6 12.9a4.6 4.6 0 0 1 0-6.5 4.6 4.6 0 0 1 6.5 0l.9.9.9-.9a4.6 4.6 0 0 1 6.5 0 4.6 4.6 0 0 1 0 6.5z" />,

  // Cafe - a cup with a saucer and a handle, as on the sheet.
  cafes: (
    <>
      <path d="M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" />
      <path d="M16 9.5h1.8a2.6 2.6 0 0 1 0 5.2H16" />
      <path d="M3 21h14" />
    </>
  ),

  // Food - a fork and a knife.
  restaurants: (
    <>
      <path d="M7 3v7" />
      <path d="M4.6 3v3.4a2.4 2.4 0 0 0 4.8 0V3" />
      <path d="M7 10v11" />
      <path d="M17 21v-7" />
      <path d="M17 14c2 0 2.6-1.6 2.6-4.4C19.6 6 18.6 3 17 3s-2.6 3-2.6 6.6c0 2.8.6 4.4 2.6 4.4z" />
    </>
  ),

  // Outdoor - a tree. Two tiers rather than one, matching the layered canopy
  // on the sheet; a single rounded canopy read as a lollipop at 18px, which
  // is the size that decides whether an icon works.
  parks: (
    <>
      <path d="M12 3 7.5 10h9z" />
      <path d="M12 8.5 5 17.5h14z" />
      <path d="M12 17.5V21" />
    </>
  ),

  // Events - a party popper.
  events: (
    <>
      <path d="M3.5 20.5 9 9l6 6z" />
      <path d="M14 3.5v2M18.5 5.5l-1.4 1.4M20.5 10h-2" />
      <path d="M11.5 6.5a3.4 3.4 0 0 0 5 5" />
    </>
  ),

  // Not on the sheet, but this directory has them: a building for museums
  // and a bag for shopping, drawn on the same grid so the row stays a set.
  museums: (
    <>
      <path d="M4 10h16" />
      <path d="M12 3.5 4 8h16z" />
      <path d="M6.5 10v7M11 10v7M15.5 10v7M20 10v7" />
      <path d="M3.5 20.5h17" />
    </>
  ),

  shopping: (
    <>
      <path d="M5 7h14l1 13.5H4z" />
      <path d="M8.5 10V6.5a3.5 3.5 0 0 1 7 0V10" />
    </>
  ),
}

/**
 * One icon, or nothing when there is no drawing for that name.
 *
 * Nothing rather than a placeholder: a caller that has an emoji to fall back
 * on should use it, and one that does not should show a gap rather than a
 * question mark.
 */
export function Glyph({
  name,
  size = 20,
  className = '',
}: {
  name: string
  size?: number
  className?: string
}) {
  const glyph = GLYPHS[name]
  if (!glyph) return null

  return (
    <svg {...STROKE} width={size} height={size} className={`shrink-0 ${className}`}>
      {glyph}
    </svg>
  )
}

/** Whether a name has a drawing, for callers choosing between sources. */
export const hasGlyph = (name: string): boolean => name in GLYPHS
