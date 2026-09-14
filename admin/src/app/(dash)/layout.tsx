import Link from 'next/link'
import { signOut } from '@/actions/auth'
import { requireSession } from '@/lib/auth'
import { Mascot } from '@/components/mascot'
import { NavLink } from '@/components/nav-link'
import { Button } from '@/components/ui'

/**
 * The auth boundary for every page in this group. A layout runs before the
 * pages inside it, so no authenticated screen can be reached without passing
 * through here - and the actions those screens submit to re-check the session
 * themselves, since a layout guards rendering, not POSTs.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireSession()

  return (
    <div className="min-h-dvh">
      <header className="border-b border-[var(--color-line)]">
        <nav className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
          <Link href="/places" className="mr-4 flex items-center gap-2 font-extrabold tracking-tight">
            <Mascot size={30} />
            Place Map
            <span className="rounded-full bg-[var(--color-coral-soft)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[var(--color-danger)]">
              admin
            </span>
          </Link>

          <NavLink href="/places">Places</NavLink>
          <NavLink href="/categories">Categories</NavLink>

          <form action={signOut} className="ml-auto">
            <Button variant="ghost" type="submit">
              Sign out
            </Button>
          </form>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  )
}
