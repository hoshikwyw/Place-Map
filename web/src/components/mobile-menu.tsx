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

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
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
        className="order-2 ml-auto flex size-10 shrink-0 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink)] transition hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)] sm:hidden"
      >
        <Glyph name={open ? 'close' : 'menu'} size={20} />
      </button>

      {/*
        order-4 puts the panel after the search box on a phone, and w-full in a
        wrapping row is what gives it a line of its own. From `sm` the orders
        and the widths drop away and it is the header's right-hand group again.
      */}
      <div
        id={panelId}
        className={`${
          open ? 'flex' : 'hidden'
        } order-4 w-full flex-col items-stretch gap-0.5 border-t border-[var(--color-line)] pb-1 pt-2 sm:order-none sm:ml-auto sm:flex sm:w-auto sm:flex-row sm:items-center sm:gap-3 sm:border-0 sm:p-0`}
      >
        {children}
      </div>
    </>
  )
}
