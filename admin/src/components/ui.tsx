import Link from 'next/link'
import type { ReactNode } from 'react'
import { Logo } from './logo'

/**
 * The whole component library. Hand-rolled rather than pulled from a kit: the
 * dashboard needs a handful of controls, and a component library would be more
 * dependency than product.
 *
 * Same visual language as the public site: generous rounding, pill buttons,
 * hairline borders instead of shadows, soft tinted chips.
 */

/** A soft halo rather than a hard outline - calmer on a screen used for hours. */
const focus =
  'focus:outline-none focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[var(--color-accent-soft)]'

/**
 * `flush` drops the padding, for lists whose rows run edge to edge. An explicit
 * prop rather than passing `p-0`: with both `p-6` and `p-0` on one element,
 * Tailwind's stylesheet order decides, and `p-6` won.
 */
export function Card({
  children,
  className = '',
  flush = false,
}: {
  children: ReactNode
  className?: string
  flush?: boolean
}) {
  return (
    <div
      className={`surface overflow-hidden ${flush ? '' : 'p-6'} ${className}`}
    >
      {children}
    </div>
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-xs text-[var(--color-muted)]">{hint}</span> : null}
    </label>
  )
}

const inputClass = `w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm transition placeholder:text-[var(--color-muted)] ${focus}`

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className ?? ''}`} />
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputClass} ${props.className ?? ''}`} rows={3} />
}

export function Checkbox({
  name,
  label,
  value,
  defaultChecked,
}: {
  name: string
  label: string
  /**
   * For a group of boxes sharing one name: without it every ticked box
   * submits "on" and the server cannot tell which one was ticked.
   */
  value?: string
  defaultChecked?: boolean
}) {
  return (
    <label className="flex items-center gap-2 text-sm font-semibold">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="size-4 accent-[var(--color-accent)]"
      />
      {label}
    </label>
  )
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }) {
  // The recipes live in globals.css (.btn), shared with links that look like
  // buttons. `ghost` keeps its name here but is the outlined one.
  const styles = { primary: 'btn-primary', ghost: 'btn-secondary', danger: 'btn-danger' }[variant]

  return <button {...props} className={`btn ${styles} ${className}`} />
}

/** Shows an API message verbatim - those are written to be read by a human. */
export function ErrorBanner({ message }: { message?: string | null }) {
  if (!message) return null
  return (
    <p
      role="alert"
      className="rounded-md bg-[var(--color-danger-soft)] px-4 py-2.5 text-sm font-semibold text-[var(--color-danger)]"
    >
      {message}
    </p>
  )
}

export function Badge({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'warn' }) {
  const styles =
    tone === 'warn'
      ? 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]'
      : 'bg-[var(--color-canvas)] text-[var(--color-muted)]'
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${styles}`}>{children}</span>
}

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <h1 className="min-w-0 break-words text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
      {action}
    </div>
  )
}

/**
 * A headed group inside a long form, with a hairline above it. The place
 * form runs to some thirty fields; without groups it read as one undivided
 * column, and finding "the hours" meant scanning all of it.
 *
 * first-of-type, not first: a form often starts with a hidden input, which
 * would make no section the first child, and the top group grew a stray rule.
 */
export function FormSection({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: ReactNode
}) {
  return (
    <section className="space-y-5 border-t border-[var(--color-line)] pt-6 first-of-type:border-0 first-of-type:pt-0">
      <div>
        <h2 className="text-base font-bold">{title}</h2>
        {hint && <p className="mt-0.5 text-sm text-[var(--color-muted)]">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

/** The way back from an editor to its list: a ghost button with a chevron. */
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="btn btn-ghost -mr-2 gap-1 px-3">
      <svg aria-hidden viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        <path d="m15 6-6 6 6 6" />
      </svg>
      {children}
    </Link>
  )
}

/** Empty lists get the mascot - the one place a data screen can afford warmth. */
export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <Logo size={80} />
      <p className="text-sm text-[var(--color-muted)]">{children}</p>
    </div>
  )
}
