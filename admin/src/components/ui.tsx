import type { ReactNode } from 'react'
import { Mascot } from './mascot'

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
      className={`overflow-hidden rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] ${flush ? '' : 'p-6'} ${className}`}
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

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputClass} ${props.className ?? ''}`} />
}

export function Checkbox({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm font-semibold">
      <input
        type="checkbox"
        name={name}
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
  const styles = {
    primary: 'bg-[var(--color-accent)] text-[var(--color-on-accent)] hover:opacity-90',
    ghost:
      'border border-[var(--color-line)] bg-[var(--color-surface)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]',
    // Soft coral rather than a loud red: destructive, but still on-brand.
    danger: 'bg-[var(--color-coral-soft)] text-[var(--color-danger)] hover:opacity-80',
  }[variant]

  return (
    <button
      {...props}
      className={`rounded-full px-5 py-2 text-sm font-bold transition active:scale-[0.98] disabled:opacity-50 ${styles} ${className}`}
    />
  )
}

/** Shows an API message verbatim - those are written to be read by a human. */
export function ErrorBanner({ message }: { message?: string | null }) {
  if (!message) return null
  return (
    <p
      role="alert"
      className="rounded-md bg-[var(--color-coral-soft)] px-4 py-2.5 text-sm font-semibold text-[var(--color-danger)]"
    >
      {message}
    </p>
  )
}

export function Badge({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'warn' }) {
  const styles =
    tone === 'warn'
      ? 'bg-[var(--color-coral-soft)] text-[var(--color-danger)]'
      : 'bg-[var(--color-canvas)] text-[var(--color-muted)]'
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${styles}`}>{children}</span>
}

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
      {action}
    </div>
  )
}

/** Empty lists get the mascot - the one place a data screen can afford warmth. */
export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <Mascot size={80} />
      <p className="text-sm text-[var(--color-muted)]">{children}</p>
    </div>
  )
}
