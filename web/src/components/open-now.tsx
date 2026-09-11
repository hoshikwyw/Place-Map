'use client'

import { useEffect, useState } from 'react'
import { isOpenAt, type OpeningHours, type OpenState } from '@place-map/shared'
import { t, type Locale } from '@/lib/i18n'

/**
 * Computed in the browser, after mount, on purpose.
 *
 * Pages are cached for minutes at a time; an "Open now" baked into the HTML at
 * 17:58 would still say open at 18:03. Evaluating on the client keeps it true
 * at the moment someone reads it - in the place's time zone, not the reader's.
 * Rendering nothing until mounted also avoids a server/client hydration
 * mismatch, since the two clocks never agree to the second.
 */
export function OpenNow({
  hours,
  timeZone,
  locale,
}: {
  hours: OpeningHours | null
  timeZone: string
  locale: Locale
}) {
  const [state, setState] = useState<OpenState | null>(null)

  useEffect(() => {
    const update = () => setState(isOpenAt(hours, new Date(), timeZone))
    update()
    const timer = setInterval(update, 60_000)
    return () => clearInterval(timer)
  }, [hours, timeZone])

  if (!state) return null
  const text = t(locale)

  return state.open ? (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-open)]">
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {text.openNow}
      {state.closesAt && (
        <span className="font-normal text-[var(--color-muted)]">· {text.closesAt(state.closesAt)}</span>
      )}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-closed)]">
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {text.closedNow}
    </span>
  )
}
