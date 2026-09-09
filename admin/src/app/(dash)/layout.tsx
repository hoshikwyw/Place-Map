import Link from 'next/link'
import { signOut } from '@/actions/auth'
import { requireSession } from '@/lib/auth'
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
      <header className="border-b border-[var(--color-line)] bg-[var(--color-surface)]">
        <nav className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <span className="font-semibold">Place Map</span>

          <Link href="/places" className="text-sm hover:underline">
            Places
          </Link>
          <Link href="/categories" className="text-sm hover:underline">
            Categories
          </Link>

          <form action={signOut} className="ml-auto">
            <Button variant="ghost" type="submit">
              Sign out
            </Button>
          </form>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  )
}
