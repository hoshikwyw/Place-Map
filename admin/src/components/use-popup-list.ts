'use client'

import { useEffect, useRef } from 'react'

/**
 * The two rules every popup list in this dashboard follows, in one place.
 *
 * Both the category dropdown and the time picker had their own copy, and a
 * copy is how they would eventually disagree about something a user feels:
 * one closing on an outside click while the other needs Escape, or one losing
 * the highlighted row off-screen while arrowing.
 *
 * Only these two rules are here. The key handling looks similar in both but is
 * not: the dropdown opens on Enter and returns focus to its trigger, while the
 * picker opens on the arrows only and reads a ref to avoid a stale closure.
 * Folding those together would need a flag per difference, which is worse than
 * writing each one out.
 */
export function usePopupList({
  open,
  active,
  onClose,
}: {
  open: boolean
  /** Index of the highlighted option, kept in view while arrowing. */
  active: number
  onClose: () => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const optionRefs = useRef<(HTMLLIElement | null)[]>([])

  // Held in a ref so the listener below is bound once per open, not on every
  // render: callers pass a fresh closure each time.
  const close = useRef(onClose)
  close.current = onClose

  // Clicking anywhere else closes the list. pointerdown rather than click, so
  // it closes as the press starts - the same instant the browser would move
  // focus - instead of after the release.
  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close.current()
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  // Keep the highlighted option in view when arrowing through a long list -
  // the time picker has 96 of them.
  useEffect(() => {
    if (open) optionRefs.current[active]?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  return { rootRef, optionRefs }
}
