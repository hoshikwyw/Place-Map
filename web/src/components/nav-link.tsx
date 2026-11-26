'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

/**
 * A header link that knows when it is the page being viewed.
 *
 * `aria-current="page"` is the whole mechanism: screen readers announce it as
 * "current page", and `.btn-ghost[aria-current='page']` in globals.css paints
 * it - so what is said and what is shown cannot drift apart.
 *
 * A client component only because the header is cached and shared by every
 * page; the path has to be read where the page is, not where the header was
 * rendered.
 */
export function NavLink({
  href,
  className,
  children,
}: {
  href: string
  className: string
  children: ReactNode
}) {
  const pathname = usePathname()
  const current = pathname.replace(/\/$/, '') === href

  return (
    <Link href={href} aria-current={current ? 'page' : undefined} className={className}>
      {children}
    </Link>
  )
}
