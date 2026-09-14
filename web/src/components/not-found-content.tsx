import Link from 'next/link'
import { t, type Locale } from '@/lib/i18n'
import { Mascot } from './mascot'

/**
 * The 404 body, shared by the two places Next can render a not-found from:
 * `app/not-found.tsx` for a full page load, and `[lang]/not-found.tsx` for a
 * client-side navigation. No hooks, so it works in either.
 */
export function NotFoundContent({ locale }: { locale: Locale }) {
  const text = t(locale)

  return (
    <div className="flex flex-col items-center py-16 text-center">
      <Mascot size={120} className="mb-6" />
      <h1 className="mb-2 text-3xl font-extrabold">{text.notFoundTitle}</h1>
      <p className="mb-8 max-w-md text-[var(--color-muted)]">{text.notFoundBody}</p>
      <Link
        href={`/${locale}`}
        className="rounded-full bg-[var(--color-accent)] px-6 py-2.5 text-sm font-bold text-[var(--color-on-accent)] transition hover:opacity-90"
      >
        {text.backHome}
      </Link>
    </div>
  )
}
