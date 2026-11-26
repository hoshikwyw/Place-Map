import Link from 'next/link'
import { t, type Locale } from '@/lib/i18n'
import { StatusContent } from './status-content'

/**
 * The 404 body, shared by the two places Next can render a not-found from:
 * `app/not-found.tsx` for a full page load, and `[lang]/not-found.tsx` for a
 * client-side navigation. No hooks, so it works in either.
 */
export function NotFoundContent({ locale }: { locale: Locale }) {
  const text = t(locale)

  return (
    <StatusContent
      code="404"
      title={text.notFoundTitle}
      body={text.notFoundBody}
      actions={
        <>
          <Link href={`/${locale}`} className="btn btn-primary px-6">
            {text.backHome}
          </Link>
          {/* The other way on from a dead link: look for what it was. */}
          <Link href={`/${locale}/search`} className="btn btn-secondary px-6">
            {text.search}
          </Link>
        </>
      }
    />
  )
}
