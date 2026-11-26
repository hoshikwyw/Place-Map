import type { ReactNode } from 'react'
import { Logo } from './logo'

/**
 * How the site says "nothing here" and "that worked" / "that failed" - once,
 * so every empty list and every form answers in the same shape.
 */

/**
 * An empty list: no places in a category, no results, nothing saved, no
 * matches for the filters, nothing on the map.
 *
 * A soft dashed panel rather than loose text on the page: it marks out where
 * the list would be, so "empty" reads as a state of this list and not as a
 * page that failed to load. Always offers somewhere to go when there is one -
 * an empty state with no way forward is a dead end.
 */
export function EmptyState({
  children,
  actions,
  art = 'logo',
}: {
  /** The sentence that says what is empty, and usually why. */
  children: ReactNode
  /** Links or buttons: what to do instead. */
  actions?: ReactNode
  /** The mascot, or nothing - inside a list that already has chrome above it. */
  art?: 'logo' | 'none'
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-[var(--brand-radius-xl)] border border-dashed border-[var(--color-line)] bg-[var(--color-surface)]/60 px-6 py-12 text-center">
      {art === 'logo' && <Logo size={88} />}
      <p className="max-w-sm text-pretty text-[var(--color-muted)]">{children}</p>
      {actions && <div className="flex flex-wrap items-center justify-center gap-2">{actions}</div>}
    </div>
  )
}

/** A tick in a soft green circle, above a form's "thank you". */
export function SuccessMark() {
  return (
    <span
      aria-hidden
      className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-[var(--color-success-soft)] text-[var(--color-success)]"
    >
      <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <path d="m5 12.5 4.5 4.5L19 7.5" />
      </svg>
    </span>
  )
}

/**
 * A form's error, announced as it appears (role=alert) and marked with an
 * icon, so it is not told apart from the text around it by colour alone.
 */
export function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-[var(--brand-radius-md)] bg-[var(--color-danger-soft)] px-3.5 py-2.5 text-sm font-semibold text-[var(--color-danger)]"
    >
      <svg aria-hidden viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="mt-px shrink-0">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5v5.5M12 16.5h.01" />
      </svg>
      <span>{children}</span>
    </p>
  )
}
