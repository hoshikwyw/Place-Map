import Link from 'next/link'
import { t, type Locale } from '@/lib/i18n'

/**
 * The 404 body, shared by the two places Next can render a not-found from:
 * `app/global-not-found.tsx` for a full page load, and `[lang]/not-found.tsx`
 * for a client-side navigation. No hooks, so it works in either.
 */
export function NotFoundContent({ locale }: { locale: Locale }) {
  const text = t(locale)

  return (
    <div className="py-16 text-center">
      <h1 className="mb-2 text-2xl font-semibold">{text.notFoundTitle}</h1>
      <p className="mb-6 text-[var(--color-muted)]">{text.notFoundBody}</p>
      <Link href={`/${locale}`} className="text-[var(--color-accent)] hover:underline">
        {text.backHome}
      </Link>
    </div>
  )
}
