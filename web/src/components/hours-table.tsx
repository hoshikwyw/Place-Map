'use client'

import { useEffect, useState } from 'react'
import { WEEKDAYS, groupHours, type OpeningHours, type Weekday } from '@place-map/shared'
import { clockTime, dayLabel, t, type Locale } from '@/lib/i18n'

/**
 * Opening hours, grouped the same way as the bot's caption (shared package),
 * with today's row picked out.
 *
 * Today is what someone reading hours almost always wants, so its row gets
 * the accent tint and bold type, and aria-current="date" says the same to a
 * screen reader. Worked out in the browser after mount and in the place's
 * time zone, for the reasons OpenNow is: the page is cached, and the reader
 * may be in another zone - after midnight here it is already tomorrow there.
 */
export function HoursTable({
  hours,
  locale,
  timeZone,
}: {
  hours: OpeningHours | null
  locale: Locale
  timeZone: string
}) {
  const [today, setToday] = useState<Weekday | null>(null)

  useEffect(() => {
    const name = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone }).format(new Date()).toLowerCase()
    setToday((WEEKDAYS as readonly string[]).includes(name) ? (name as Weekday) : null)
  }, [timeZone])

  const groups = groupHours(hours)
  if (!groups) return null

  const text = t(locale)
  const todayIndex = today ? WEEKDAYS.indexOf(today) : -1

  return (
    <table className="w-full border-separate border-spacing-y-0.5 text-sm">
      <tbody>
        {groups.map(({ first, last, ranges }) => {
          // A group is a run of consecutive days, so today is in it when it
          // falls between the run's first and last day.
          const isToday = todayIndex >= WEEKDAYS.indexOf(first) && todayIndex <= WEEKDAYS.indexOf(last)
          const cell = isToday ? 'bg-[var(--color-accent-soft)] font-semibold text-[var(--color-accent)]' : ''

          return (
            <tr key={first} aria-current={isToday ? 'date' : undefined}>
              {/* The day may wrap on a narrow screen; the times may not. Myanmar
                  writes both longer - "တနင်္လာ-သောကြာ" beside "နံနက် 9:00–ညနေ
                  6:00" - and at 320px something has to give. It is this: a day
                  name over two lines still reads, a time range split across
                  them does not. */}
              <th
                scope="row"
                className={`rounded-l-[var(--brand-radius-sm)] py-1.5 pl-2.5 pr-2 text-left align-top font-normal sm:whitespace-nowrap sm:pr-4 ${
                  isToday ? cell : 'text-[var(--color-muted)]'
                }`}
              >
                {first === last
                  ? dayLabel(locale, first)
                  : `${dayLabel(locale, first)}–${dayLabel(locale, last)}`}
              </th>
              <td className={`rounded-r-[var(--brand-radius-sm)] py-1.5 pr-2.5 text-right align-top tabular-nums ${cell}`}>
                {/* One range per line: a split shift joined with commas broke
                    mid-range ("16:00- / 22:00") in the narrow sidebar. */}
                {ranges.length
                  ? ranges.map(([open, close]) => (
                      <span key={open} className="block whitespace-nowrap">
                        {clockTime(locale, open)}–{clockTime(locale, close)}
                      </span>
                    ))
                  : text.closed}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
