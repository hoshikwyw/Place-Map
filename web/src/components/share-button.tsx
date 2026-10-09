'use client'

import { useEffect, useState } from 'react'
import { t, type Locale } from '@/lib/i18n'

/**
 * Passes a place on.
 *
 * Two behaviours behind one button. On a phone, `navigator.share` opens the
 * system sheet, which is how people actually send a place to somebody - into
 * Viber or Messenger, where most of Yangon arranges to meet. On a desktop
 * browser, which mostly has no share sheet, it copies the link instead and
 * says so, because a button that appears to do nothing reads as broken.
 *
 * The URL comes from `location.href` rather than being passed in: this only
 * ever shares the page it is on, and reading it at click time means a filter
 * or a gallery in the address bar travels with it.
 */
export function ShareButton({ title, locale }: { title: string; locale: Locale }) {
  const text = t(locale)
  const [copied, setCopied] = useState(false)
  const [canCopy, setCanCopy] = useState(true)

  // Neither API is available over plain HTTP, and the clipboard is absent in
  // some in-app browsers. Nothing is drawn rather than drawing a button that
  // cannot do anything - which is also why this is decided after mounting.
  useEffect(() => {
    setCanCopy(Boolean(navigator.share) || Boolean(navigator.clipboard))
  }, [])

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  if (!canCopy) return null

  async function share() {
    const url = window.location.href

    if (navigator.share) {
      try {
        await navigator.share({ title, url })
        return
      } catch {
        // Dismissing the sheet rejects, and so does a browser that advertises
        // share but refuses this payload. Neither is worth a message; fall
        // through to copying, which always says something.
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      // Blocked clipboard: say nothing rather than claim a copy that did not
      // happen. The address bar is still right there.
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-bold transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
    >
      {copied ? <TickIcon /> : <ShareIcon />}
      {copied ? text.shareCopied : text.share}
    </button>
  )
}

const iconProps = {
  'aria-hidden': true,
  viewBox: '0 0 24 24',
  width: 18,
  height: 18,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

const ShareIcon = () => (
  <svg {...iconProps}>
    <path d="M12 16V4" />
    <path d="m8 8 4-4 4 4" />
    <path d="M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5" />
  </svg>
)

const TickIcon = () => (
  <svg {...iconProps}>
    <path d="m5 13 4 4L19 7" />
  </svg>
)
