'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Glyph } from './icons'

/**
 * The phone header's menu: a button, and the panel it opens.
 *
 * A header that fits on a laptop does not fit on a phone. Brand, search, two
 * nav links, a language switcher and a theme toggle wrapped onto a second row
 * below 390px - the controls shoved to the right of an otherwise empty line -
 * and the header took a seventh of the screen before any of the page showed.
 *
 * **The panel and the desktop row are the same element**, re-laid-out at `sm`:
 * a column that opens under the header on a phone, an inline row from `sm` up.
 * Rendering the links twice and hiding one copy would mean two "Language"
 * navigations and two of every link in the accessibility tree, which is the
 * sort of thing a screen reader notices and a sighted test does not.
 */
export function MobileMenu({
  labels,
  children,
}: {
  labels: { open: string; close: string }
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  // Navigation inside the panel is client-side: the header never unmounts, so
  // without this the menu stays open over whatever page you just went to.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      // Escape must give focus back, or a keyboard user is dropped at the top
      // of the document with nothing to carry on from.
      buttonRef.current?.focus()
    }

    // A tap anywhere outside the card closes it, as any dropdown does. The
    // button is excluded: its own click toggles, and closing here first
    // would make that click open the menu straight back up.
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return
      setOpen(false)
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open])

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? labels.close : labels.open}
        className={`btn btn-ghost btn-icon order-2 ml-auto shrink-0 text-[var(--color-ink)] sm:hidden ${open ? 'bg-[var(--color-accent-soft)]' : ''}`}
      >
        <Glyph name={open ? 'close' : 'menu'} size={20} />
      </button>

      {/*
        On a phone, a card floating just under the header, on the raised
        surface - it used to open as a band inside the header, which pushed the
        whole page down and back up every time. From `sm` the positioning,
        the card and the padding all drop away and it is the header's
        right-hand group again. (The header is `relative` for the anchor.)
      */}
      <div
        ref={panelRef}
        id={panelId}
        className={`${
          open ? 'flex' : 'hidden'
        } surface surface-floating absolute inset-x-3 top-full z-40 mt-2 flex-col items-stretch gap-0.5 rounded-[var(--brand-radius-xl)] bg-[var(--color-raised)] p-2 sm:static sm:ml-auto sm:flex sm:flex-row sm:items-center sm:gap-2 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none`}
      >
        {children}
      </div>
    </>
  )
}
