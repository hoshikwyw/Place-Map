'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

/**
 * A thin accent bar across the top of the screen while the next page loads.
 *
 * Every page reads the theme cookie in the layout, so every page renders on
 * request, and a tap on a card used to change nothing on screen until the
 * next page was ready - which reads as a tap that missed.
 *
 * Why a bar and not loading.tsx skeletons, which this replaces: a loading.tsx
 * makes the route stream, and once a streamed response has started its
 * status is sent - so notFound() could no longer answer 404. An unknown
 * place came back 200 with a noindex tag, a "soft 404" to every crawler and
 * link checker. The bar lives in the browser, so the server's answer is
 * untouched and a missing page is a real 404 again.
 *
 * App Router has no navigation events, so the bar starts on a click on a
 * same-site link that goes somewhere else, and finishes when the URL the
 * router reports changes. A plain form submission (the search box) is a full
 * page load, which the browser already shows; the filter chips dim their own
 * results while they load.
 */

/** Below this a navigation is instant enough that a bar would only flicker. */
const SHOW_AFTER_MS = 120

/** A click that never turned into a navigation should not leave a bar up. */
const GIVE_UP_AFTER_MS = 10_000

type State = 'idle' | 'loading' | 'done'

export function NavigationProgress() {
  const pathname = usePathname()
  const search = useSearchParams()
  const [state, setState] = useState<State>('idle')
  const showTimer = useRef<number | undefined>(undefined)
  const giveUpTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      // Not `defaultPrevented`: next/link prevents the default itself, in a
      // React handler that has already run by the time this one does.
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const link = (event.target as Element | null)?.closest?.('a[href]')
      if (!(link instanceof HTMLAnchorElement)) return
      if ((link.target && link.target !== '_self') || link.hasAttribute('download')) return

      const url = new URL(link.href, window.location.href)
      if (url.origin !== window.location.origin) return
      // The same page, or a #fragment on it: nothing is going to load.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return

      window.clearTimeout(showTimer.current)
      window.clearTimeout(giveUpTimer.current)
      showTimer.current = window.setTimeout(() => setState('loading'), SHOW_AFTER_MS)
      giveUpTimer.current = window.setTimeout(() => setState('idle'), GIVE_UP_AFTER_MS)
    }

    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  // The router has moved: finish the bar if it was showing, and cancel it if
  // the page arrived before it was due to appear.
  useEffect(() => {
    window.clearTimeout(showTimer.current)
    window.clearTimeout(giveUpTimer.current)
    setState((current) => (current === 'loading' ? 'done' : 'idle'))
  }, [pathname, search])

  // Long enough for the bar to reach the end and fade (see .nav-progress).
  useEffect(() => {
    if (state !== 'done') return
    const timer = window.setTimeout(() => setState('idle'), 450)
    return () => window.clearTimeout(timer)
  }, [state])

  if (state === 'idle') return null

  // Decoration for sighted users only: Next's route announcer already tells
  // a screen reader the new page's title when it arrives.
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px]">
      <div className={`nav-progress ${state === 'done' ? 'nav-progress-done' : ''}`} />
    </div>
  )
}
