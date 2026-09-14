import Link from 'next/link'
import { t, type Locale } from '@/lib/i18n'

export function Pagination({
  locale,
  page,
  totalPages,
  hrefFor,
}: {
  locale: Locale
  page: number
  totalPages: number
  hrefFor: (page: number) => string
}) {
  if (totalPages <= 1) return null
  const text = t(locale)

  const pill = 'rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-2 font-semibold'

  const link = (target: number, label: string, rel: 'prev' | 'next', enabled: boolean) =>
    enabled ? (
      <Link
        href={hrefFor(target)}
        rel={rel}
        className={`${pill} transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]`}
      >
        {label}
      </Link>
    ) : (
      <span className={`${pill} opacity-40`}>{label}</span>
    )

  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-between text-sm">
      {link(page - 1, `← ${text.previous}`, 'prev', page > 1)}
      <span className="text-[var(--color-muted)]">{text.pageOf(page, totalPages)}</span>
      {link(page + 1, `${text.next} →`, 'next', page < totalPages)}
    </nav>
  )
}
