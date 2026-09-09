import type { ReactNode } from 'react'

/**
 * The whole component library. Hand-rolled rather than pulled from a kit: the
 * dashboard needs six controls, and a component library would be more
 * dependency than product.
 */

const focus =
  'focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-1 focus:ring-offset-[var(--color-surface)]'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-5 ${className}`}
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
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-[var(--color-muted)]">{hint}</span> : null}
    </label>
  )
}

const inputClass = `w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm ${focus}`

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
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-4" />
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
    primary: 'bg-[var(--color-accent)] text-white hover:opacity-90',
    ghost: 'border border-[var(--color-line)] hover:bg-[var(--color-canvas)]',
    danger: 'text-[var(--color-danger)] border border-[var(--color-danger)] hover:bg-[var(--color-danger)]/10',
  }[variant]

  return (
    <button
      {...props}
      className={`rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50 ${styles} ${focus} ${className}`}
    />
  )
}

/** Shows an API message verbatim - those are written to be read by a human. */
export function ErrorBanner({ message }: { message?: string | null }) {
  if (!message) return null
  return (
    <p
      role="alert"
      className="rounded-md border border-[var(--color-danger)] bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-[var(--color-danger)]"
    >
      {message}
    </p>
  )
}

export function Badge({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'warn' }) {
  const styles =
    tone === 'warn'
      ? 'border-[var(--color-danger)] text-[var(--color-danger)]'
      : 'border-[var(--color-line)] text-[var(--color-muted)]'
  return <span className={`rounded border px-1.5 py-0.5 text-xs ${styles}`}>{children}</span>
}

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-4">
      <h1 className="text-xl font-semibold">{title}</h1>
      {action}
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-sm text-[var(--color-muted)]">{children}</p>
}
