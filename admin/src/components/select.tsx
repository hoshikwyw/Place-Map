'use client'

import { useEffect, useId, useRef, useState } from 'react'

/**
 * A dropdown that follows the theme.
 *
 * A native <select> cannot: the browser hands its option list to the operating
 * system, so the open menu keeps Windows' own white panel and blue highlight no
 * matter what CSS says. This is the standard button + listbox pattern instead,
 * drawn with the brand tokens, with the keyboard behaviour people expect from a
 * select: typing a letter jumps, arrows move, Enter picks, Escape closes.
 *
 * The value travels in a hidden input, so it still submits with a plain form -
 * the places filter is a GET form, and the place editor posts to a server
 * action. With JavaScript off, the <noscript> block below keeps a working
 * native select rather than an unusable button.
 */

export interface SelectOption {
  value: string
  label: string
}

export function Select({
  name,
  options,
  defaultValue = '',
  placeholder,
  className = '',
  onChange,
  'aria-label': ariaLabel,
}: {
  name: string
  options: SelectOption[]
  defaultValue?: string
  /** For a caller that keeps the value itself, such as the links editor. */
  onChange?: (value: string) => void
  /** Shown when nothing is selected. Without it, the first option is the default. */
  placeholder?: string
  className?: string
  'aria-label'?: string
}) {
  const all = placeholder ? [{ value: '', label: placeholder }, ...options] : options

  // The hidden input is rendered only after hydration: without JavaScript the
  // <noscript> select below carries the value instead, and two inputs sharing
  // one name would submit the field twice.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const [value, setValue] = useState(defaultValue)

  // Follow the default when it changes. Navigating within the same page - the
  // "Clear" link resetting the filters, say - re-renders this component rather
  // than remounting it, so without this the dropdown would keep showing a
  // filter the page is no longer using.
  useEffect(() => {
    setValue(defaultValue)
  }, [defaultValue])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(() => Math.max(0, all.findIndex((o) => o.value === defaultValue)))

  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<(HTMLLIElement | null)[]>([])
  const typed = useRef({ text: '', at: 0 })

  const selected = all.find((option) => option.value === value) ?? all[0]

  // Clicking anywhere else, or moving focus away, closes the list.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  // Keep the highlighted option in view when arrowing through a long list.
  useEffect(() => {
    if (open) optionRefs.current[active]?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  const choose = (index: number) => {
    const option = all[index]
    if (!option) return
    setValue(option.value)
    onChange?.(option.value)
    setActive(index)
    setOpen(false)
    buttonRef.current?.focus()
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    const last = all.length - 1

    if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault()
      setOpen(true)
      return
    }

    if (!open) return

    switch (event.key) {
      case 'Escape':
        event.preventDefault()
        setOpen(false)
        buttonRef.current?.focus()
        return
      case 'ArrowDown':
        event.preventDefault()
        setActive((index) => Math.min(last, index + 1))
        return
      case 'ArrowUp':
        event.preventDefault()
        setActive((index) => Math.max(0, index - 1))
        return
      case 'Home':
        event.preventDefault()
        setActive(0)
        return
      case 'End':
        event.preventDefault()
        setActive(last)
        return
      case 'Enter':
      case ' ':
        event.preventDefault()
        choose(active)
        return
      case 'Tab':
        setOpen(false)
        return
      default:
        break
    }

    // Typeahead: "ca" jumps to Cafes. Resets after a second's pause.
    if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
      const now = Date.now()
      typed.current = {
        text: now - typed.current.at > 1000 ? event.key : typed.current.text + event.key,
        at: now,
      }
      const match = all.findIndex((option) => option.label.toLowerCase().startsWith(typed.current.text.toLowerCase()))
      if (match >= 0) setActive(match)
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {mounted && <input type="hidden" name={name} value={value} />}

      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((isOpen) => !isOpen)}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        aria-label={ariaLabel}
        className="flex w-full items-center gap-2 rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-2.5 text-left text-sm transition focus:border-[var(--color-accent)] focus:outline-none focus:ring-4 focus:ring-[var(--color-accent-soft)]"
      >
        <span className={`flex-1 truncate ${selected?.value ? '' : 'text-[var(--color-muted)]'}`}>
          {selected?.label ?? ''}
        </span>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`size-4 shrink-0 text-[var(--color-muted)] transition ${open ? 'rotate-180' : ''}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] p-1 shadow-xl focus:outline-none"
        >
          {all.map((option, index) => {
            const isSelected = option.value === value
            return (
              <li
                key={option.value || 'none'}
                ref={(node) => {
                  optionRefs.current[index] = node
                }}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={isSelected}
                onClick={() => choose(index)}
                // pointermove, not pointerenter: a stationary cursor must not
                // steal the highlight from the keyboard when the list reopens.
                onPointerMove={() => setActive(index)}
                className={`flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm transition ${
                  index === active ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]' : ''
                } ${isSelected ? 'font-bold' : ''}`}
              >
                <span className="flex-1 truncate">{option.label}</span>
                {isSelected && (
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-3.5 shrink-0 text-[var(--color-accent)]"
                  >
                    <path d="m5 13 4 4L19 7" />
                  </svg>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {/* Without JavaScript the button above does nothing, so fall back to the
          control the browser draws itself. */}
      <noscript>
        <select
          name={name}
          defaultValue={defaultValue}
          aria-label={ariaLabel}
          className="mt-1 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm"
        >
          {all.map((option) => (
            <option key={option.value || 'none'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </noscript>
    </div>
  )
}
