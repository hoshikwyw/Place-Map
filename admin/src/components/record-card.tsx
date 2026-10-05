import Link from 'next/link'
import type { ReactNode } from 'react'

/**
 * One row of a list, as a card: an icon tile, a title, a line of detail and any
 * badges. Used by both list screens, so places and categories read the same.
 *
 * The whole card is the link - a card with a small "edit" link inside it gives
 * the same action a much smaller target for no benefit.
 */
export function RecordCard({
  href,
  icon,
  imageUrl,
  title,
  detail,
  badges,
  trailing,
}: {
  href: string
  /** An emoji, or a fallback glyph. Sits in a tinted tile. */
  icon?: string | null
  /** A picture to show instead of the emoji: the place's first photo. */
  imageUrl?: string | null
  title: string
  detail?: ReactNode
  badges?: ReactNode
  /** Right-aligned extra, such as a sort order. */
  trailing?: ReactNode
}) {
  return (
    <Link
      href={href}
      className="group flex h-full items-start gap-3 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-4 transition hover:-translate-y-0.5 hover:border-[var(--color-accent)]"
    >
      <span
        aria-hidden
        className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[var(--color-tint-soft)] text-xl"
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
        ) : (
          icon || '📍'
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold leading-snug transition group-hover:text-[var(--color-accent)]">
          {title}
        </span>
        {detail && <span className="mt-0.5 block truncate text-xs text-[var(--color-muted)]">{detail}</span>}
        {badges && <span className="mt-2 flex flex-wrap items-center gap-1.5">{badges}</span>}
      </span>

      {trailing && <span className="shrink-0 text-xs text-[var(--color-muted)]">{trailing}</span>}
    </Link>
  )
}

/** The grid both list screens lay their cards out on. */
export function CardGrid({ children }: { children: ReactNode }) {
  return <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{children}</ul>
}
