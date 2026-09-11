import Link from 'next/link'
import { Suspense } from 'react'
import { t, type Locale } from '@/lib/i18n'
import { LanguageSwitcher } from './language-switcher'
import { SearchForm } from './search-form'

export function Header({ locale }: { locale: Locale }) {
  const text = t(locale)

  return (
    <header className="border-b border-[var(--color-line)] bg-[var(--color-surface)]">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
        <Link href={`/${locale}`} className="font-semibold tracking-tight">
          {text.siteName}
        </Link>

        <div className="order-3 w-full sm:order-none sm:ml-6 sm:w-auto sm:flex-1">
          <SearchForm locale={locale} compact />
        </div>

        {/* useSearchParams in a statically rendered tree must sit under a
            Suspense boundary, or the whole page opts out of static rendering. */}
        <div className="ml-auto">
          <Suspense fallback={null}>
            <LanguageSwitcher current={locale} />
          </Suspense>
        </div>
      </div>
    </header>
  )
}
