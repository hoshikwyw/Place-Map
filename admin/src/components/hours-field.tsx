'use client'

import { useState } from 'react'
import { WEEKDAYS, type OpeningHours, type Weekday } from '@place-map/shared'
import { TimeInput } from './time-input'

/**
 * Opening hours as time pickers, one row per day.
 *
 * This replaced a text box per day ("09:00-18:00"). Typing was quick for
 * someone who knew the format, but it accepted anything - "9am", "09.00",
 * "9:00 - 18:00" - and the mistake only surfaced as a validation error after
 * saving. Time fields cannot produce an invalid time at all, and they bring the
 * phone's wheel picker on a phone, which is where most of this editing happens.
 *
 * Each day still submits the same `hours.<day>` string the server already
 * parses ("10:00-14:00, 16:00-22:00"), so nothing downstream changes.
 */

const DEFAULT_SHIFT: [string, string] = ['09:00', '18:00']
const DAY_LABEL: Record<Weekday, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
}

type Shifts = Record<Weekday, [string, string][]>

const toShifts = (hours: OpeningHours | null | undefined): Shifts =>
  Object.fromEntries(WEEKDAYS.map((day) => [day, (hours?.[day] ?? []).map(([o, c]) => [o, c])])) as Shifts

/** The format the server parses: "10:00-14:00, 16:00-22:00", empty for closed. */
const serialise = (shifts: [string, string][]) =>
  shifts
    .filter(([open, close]) => open && close)
    .map(([open, close]) => `${open}-${close}`)
    .join(', ')

export function OpeningHoursField({ hours }: { hours?: OpeningHours | null }) {
  const [shifts, setShifts] = useState<Shifts>(() => toShifts(hours))

  const update = (day: Weekday, next: [string, string][]) =>
    setShifts((current) => ({ ...current, [day]: next }))

  const setTime = (day: Weekday, index: number, side: 0 | 1, value: string) =>
    update(
      day,
      shifts[day].map((shift, i) => {
        if (i !== index) return shift
        const next: [string, string] = [...shift]
        next[side] = value
        return next
      }),
    )

  /** Most places keep the same hours every day; this saves six repetitions. */
  const copyToAll = (day: Weekday) => {
    const source = shifts[day].map(([open, close]) => [open, close] as [string, string])
    setShifts(Object.fromEntries(WEEKDAYS.map((d) => [d, source.map((s) => [...s] as [string, string])])) as Shifts)
  }

  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-sm font-bold">Opening hours</legend>
      <p className="text-xs text-[var(--color-muted)]">
        Add a second row for a split shift. A day with no rows is closed.
      </p>

      {WEEKDAYS.map((day) => {
        const rows = shifts[day]
        return (
          <div
            key={day}
            className="flex flex-wrap items-start gap-x-2 gap-y-1 rounded-md px-1 py-1.5 hover:bg-[var(--color-canvas)]"
          >
            <span className="mt-2 w-10 shrink-0 text-xs font-bold uppercase text-[var(--color-muted)]">
              {day}
            </span>

            {/* What the server reads; the controls above only edit it. */}
            <input type="hidden" name={`hours.${day}`} value={serialise(rows)} />

            {rows.length === 0 ? (
              <div className="flex items-center gap-2">
                <span className="py-2 text-sm text-[var(--color-muted)]">Closed</span>
                <TextButton onClick={() => update(day, [[...DEFAULT_SHIFT]])}>Add hours</TextButton>
              </div>
            ) : (
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                {rows.map(([open, close], index) => {
                  const backwards = Boolean(open && close) && close <= open
                  return (
                    <div key={index} className="flex flex-wrap items-center gap-2">
                      <TimeInput
                        label={`${DAY_LABEL[day]} opens`}
                        value={open}
                        invalid={backwards}
                        onChange={(value) => setTime(day, index, 0, value)}
                      />
                      <span aria-hidden className="text-[var(--color-muted)]">
                        –
                      </span>
                      <TimeInput
                        label={`${DAY_LABEL[day]} closes`}
                        value={close}
                        invalid={backwards}
                        onChange={(value) => setTime(day, index, 1, value)}
                      />

                      <button
                        type="button"
                        onClick={() => update(day, rows.filter((_, i) => i !== index))}
                        aria-label={`Remove ${DAY_LABEL[day]} ${open || 'shift'}`}
                        className="flex size-8 items-center justify-center rounded-full text-lg text-[var(--color-muted)] transition hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)]"
                      >
                        <span aria-hidden>×</span>
                      </button>

                      {index === rows.length - 1 && (
                        <>
                          <TextButton onClick={() => update(day, [...rows, [...DEFAULT_SHIFT]])}>
                            Add shift
                          </TextButton>
                          <TextButton onClick={() => copyToAll(day)}>Copy to all days</TextButton>
                        </>
                      )}

                      {backwards && (
                        <p className="w-full text-xs font-semibold text-[var(--color-danger)]">
                          Closing time must be after the opening time. A place open past midnight
                          records two days: 18:00–23:59, then 00:00–02:00 on the next.
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </fieldset>
  )
}

function TextButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold text-[var(--color-accent)] transition hover:bg-[var(--color-accent-soft)]"
    >
      {children}
    </button>
  )
}
