import Link from 'next/link'
import { signOut } from '@/actions/auth'
import { requireSession } from '@/lib/auth'
import { listReviews, listSuggestions } from '@/lib/api'
import { Logo } from '@/components/logo'
import { NavLink } from '@/components/nav-link'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui'

/**
 * The auth boundary for every page in this group. A layout runs before the
 * pages inside it, so no authenticated screen can be reached without passing
 * through here - and the actions those screens submit to re-check the session
 * themselves, since a layout guards rendering, not POSTs.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireSession()

  // The unread count, in the nav on every page. A moderation queue that has to
  // be visited to be noticed is a queue that quietly fills up. One request for
  // a dashboard with one operator; if it fails, the badge is simply absent and
  // nothing else on the page is held up for it.
  const [waiting, pendingReviews] = await Promise.all([
    listSuggestions('new')
      .then((rows) => rows.length)
      .catch(() => 0),
    listReviews(false)
      .then((rows) => rows.length)
      .catch(() => 0),
  ])

  return (
    <div className="min-h-dvh">
      {/* First in the tab order, invisible until focused. The header holds
          eight controls - five sections, the theme pair and sign out - and
          every screen would otherwise begin by walking all of them. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-[var(--color-accent)] focus:px-5 focus:py-2.5 focus:text-sm focus:font-bold focus:text-[var(--color-on-accent)]"
      >
        Skip to content
      </a>

      <header className="border-b border-[var(--color-line)]">
        {/* Wraps rather than running off the side. There are five sections
            now, plus the wordmark, the theme toggle and sign out - more than
            fits a phone in one row, and a dashboard that needs sideways
            scrolling to reach "Sign out" is a dashboard with a bug. */}
        <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-2 gap-y-1.5 px-4 py-3">
          <Link
            href="/places"
            className="mr-2 flex shrink-0 items-center gap-2 font-bold tracking-tight sm:mr-4"
          >
            <Logo size={30} />
            Place-Map
            <span className="rounded-full bg-[var(--color-danger-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-danger)]">
              admin
            </span>
          </Link>

          <NavLink href="/places">Places</NavLink>
          <NavLink href="/categories">Categories</NavLink>
          <NavLink href="/amenities">Amenities</NavLink>
          <NavLink href="/reviews">
            Reviews
            {pendingReviews > 0 && (
              <span className="ml-1.5 rounded-full bg-[var(--color-accent)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-on-accent)]">
                {pendingReviews}
              </span>
            )}
          </NavLink>
          <NavLink href="/suggestions">
            Suggestions
            {waiting > 0 && (
              <span className="ml-1.5 rounded-full bg-[var(--color-accent)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-on-accent)]">
                {waiting}
              </span>
            )}
          </NavLink>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <ThemeToggle labels={{ theme: 'Theme', light: 'Light', dark: 'Dark' }} />
          </div>

          <form action={signOut} className="ml-2">
            <Button variant="ghost" type="submit">
              Sign out
            </Button>
          </form>
        </nav>
      </header>

      {/* tabIndex -1 so the skip link moves focus here, not just the scroll. */}
      <main id="main" tabIndex={-1} className="mx-auto max-w-5xl px-4 py-8">
        {children}
      </main>
    </div>
  )
}
