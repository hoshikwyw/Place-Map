import type { ReactNode } from 'react'

/**
 * A page's title block: an optional icon, the h1, and a muted line under it.
 *
 * One pattern for every page that leads with a title - a category, search
 * results, saved places, the suggest form - where each used to pick its own
 * size and weight (2xl bold here, 3xl there).
 */
export function PageHeader({
  title,
  intro,
  icon,
  className = 'mb-8',
}: {
  title: ReactNode
  /** The line under the title: a count, or a sentence about the page. */
  intro?: ReactNode
  /** Drawn in a soft circle before the title - a category's icon. */
  icon?: ReactNode
  className?: string
}) {
  return (
    <header className={`flex items-center gap-4 ${className}`}>
      {icon && (
        <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <h1 className="font-display break-words text-[2rem] leading-tight sm:text-[2.75rem]">{title}</h1>
        {intro && <p className="mt-1.5 text-pretty text-[var(--color-muted)]">{intro}</p>}
      </div>
    </header>
  )
}
