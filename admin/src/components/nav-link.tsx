'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * A header link that knows when it is the current section, so the operator can
 * always see where they are - including on /places/12, which belongs to Places.
 */
export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      // aria-current paints it - see .btn-ghost in globals.css.
      className="btn btn-ghost px-3"
    >
      {children}
    </Link>
  )
}
