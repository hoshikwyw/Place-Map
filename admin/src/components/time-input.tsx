'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'

/**
 * A time field that follows the theme.
 *
 * `<input type="time">` was the obvious choice and had to go: its picker panel
 * is drawn by the browser, not the page, so it kept Chrome's grey panel and
 * blue highlight whatever the dashboard's theme said - and it showed "09:00 AM"
 * or "09:00" depending on the operating system's locale, while the value stored
 * is always 24-hour.
 *
 * So: a text box you can type into, plus a themed list to pick from. The value
 * in and out is always "HH:MM" in 24-hour form, which is what the API stores.
 * Typing is forgiving - "9", "930", "9.30", "9:5" all land on a real time - and
 * anything that cannot be read as a time is marked, not silently dropped.
 */

/** Every half hour. Enough to pick from; anything else is typed. */
const STEP_MINUTES = 30

const pad = (value: number) => String(value).padStart(2, '0')

const CHOICES = Array.from({ length: (24 * 60) / STEP_MINUTES }, (_, index) => {
  const minutes = index * STEP_MINUTES
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`
})

const isTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value)

/**
 * Reads what someone typed. "9" and "900" and "9:00" are all 09:00; "25:00" and
 * "9:75" are nothing at all.
 */
export function parseTime(raw: string): string | null {
  const text = raw.trim().replace(/[.\s]/g, ':')
  if (text === '') return null

  const digits = text.replace(/\D/g, '')
  let hours: number
  let minutes: number

  if (text.includes(':')) {
    const [h = '', m = ''] = text.split(':')
    hours = Number(h)
    minutes = m === '' ? 0 : Number(m)
  } else if (digits.length <= 2) {
    hours = Number(digits)
    minutes = 0
  } else {
    hours = Number(digits.slice(0, digits.length - 2))
    minutes = Number(digits.slice(-2))
  }

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return `${pad(hours)}:${pad(minutes)}`
}

export function TimeInput({
  value,
  onChange,
  label,
  invalid = false,
  className = '',
}: {
  /** "HH:MM", 24-hour. */
  value: string
  onChange: (value: string) => void
  /** For screen readers: "Monday opens", "Monday closes". */
  label: string
  invalid?: boolean
  className?: string
}) {
  const [text, setText] = useState(value)
  const [open, setOpen] = useState(false)
  const [active, setActiveState] = useState(0)

  // Mirrored in a ref: several key presses can arrive before React re-renders,
  // and a handler closed over a stale `active` would then commit the wrong
  // time. Every read in a handler goes through the ref.
  const activeRef = useRef(0)
  const setActive = (next: number) => {
    activeRef.current = next
    setActiveState(next)
  }

  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const optionRefs = useRef<(HTMLLIElement | null)[]>([])

  // Follow the value when it changes from outside - "Copy to all days" does.
  useEffect(() => setText(value), [value])

  const malformed = text.trim() !== '' && parseTime(text) === null
  const nearest = useMemo(() => {
    const parsed = parseTime(text) ?? '00:00'
    const index = CHOICES.findIndex((choice) => choice >= parsed)
    return index === -1 ? CHOICES.length - 1 : index
  }, [text])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  useEffect(() => {
    if (open) optionRefs.current[active]?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  const show = () => {
    setActive(nearest)
    setOpen(true)
  }

  const move = (delta: number) =>
    setActive(Math.min(CHOICES.length - 1, Math.max(0, activeRef.current + delta)))

  const commit = (next: string) => {
    setText(next)
    onChange(next)
    setOpen(false)
    inputRef.current?.focus()
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        show()
      }
      return
    }

    switch (event.key) {
      case 'Escape':
        event.preventDefault()
        setOpen(false)
        return
      case 'ArrowDown':
        event.preventDefault()
        move(1)
        return
      case 'ArrowUp':
        event.preventDefault()
        move(-1)
        return
      case 'Home':
        event.preventDefault()
        setActive(0)
        return
      case 'End':
        event.preventDefault()
        setActive(CHOICES.length - 1)
        return
      case 'Enter':
        event.preventDefault()
        commit(CHOICES[activeRef.current] ?? value)
        return
      case 'Tab':
        setOpen(false)
        return
      default:
        return
    }
  }

  const border = invalid || malformed ? 'border-[var(--color-danger)]' : 'border-[var(--color-line)]'

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div
        className={`flex items-center rounded-md border bg-[var(--color-surface)] transition focus-within:ring-4 focus-within:ring-[var(--color-accent-soft)] ${border} ${
          invalid || malformed ? '' : 'focus-within:border-[var(--color-accent)]'
        }`}
      >
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-activedescendant={open ? `${listId}-${active}` : undefined}
          aria-autocomplete="list"
          aria-label={label}
          aria-invalid={invalid || malformed || undefined}
          // A numeric keypad on a phone, where most of this editing happens.
          inputMode="numeric"
          autoComplete="off"
          maxLength={5}
          value={text}
          placeholder="--:--"
          onChange={(event) => {
            setText(event.target.value)
            // Only a complete, valid time reaches the form; the rest stays local
            // until it is one, so a half-typed "9:" never gets saved.
            const parsed = parseTime(event.target.value)
            if (parsed && isTime(event.target.value.trim())) onChange(parsed)
          }}
          onBlur={() => {
            const parsed = parseTime(text)
            if (parsed) {
              setText(parsed)
              if (parsed !== value) onChange(parsed)
            }
          }}
          onKeyDown={onKeyDown}
          className="w-16 bg-transparent py-2 pl-3 text-sm tabular-nums focus:outline-none"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => (open ? setOpen(false) : show())}
          aria-label={`${label}: choose from a list`}
          className="flex size-8 items-center justify-center rounded-r-md text-[var(--color-muted)] transition hover:text-[var(--color-accent)]"
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        </button>
      </div>

      {open && (
        <ul
          id={listId}
          role="listbox"
          // Not the same name as the input: two elements with one accessible
          // name makes "Monday opens" ambiguous to a screen reader.
          aria-label={`${label} options`}
          className="absolute z-30 mt-1 max-h-56 w-28 overflow-auto rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] p-1 shadow-xl"
        >
          {CHOICES.map((choice, index) => (
            <li
              key={choice}
              id={`${listId}-${index}`}
              ref={(node) => {
                optionRefs.current[index] = node
              }}
              role="option"
              aria-selected={choice === value}
              onClick={() => commit(choice)}
              // pointermove, not pointerenter: when the list reopens under a
              // stationary cursor, "enter" fires and steals the highlight from
              // whatever the keyboard had selected.
              onPointerMove={() => setActive(index)}
              className={`cursor-pointer rounded-sm px-3 py-1.5 text-sm tabular-nums transition ${
                index === active ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]' : ''
              } ${choice === value ? 'font-bold' : ''}`}
            >
              {choice}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
