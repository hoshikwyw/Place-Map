import { groupHours, type OpeningHours } from '@place-map/shared'
import { clockTime, dayLabel, t, type Locale } from '@/lib/i18n'

/** Same grouping as the bot's caption, from the shared package. */
export function HoursTable({ hours, locale }: { hours: OpeningHours | null; locale: Locale }) {
  const groups = groupHours(hours)
  if (!groups) return null

  const text = t(locale)

  return (
    <table className="w-full text-sm">
      <tbody>
        {groups.map(({ first, last, ranges }) => (
          <tr key={first} className="border-b border-[var(--color-line)] last:border-0">
            {/* The day may wrap on a narrow screen; the times may not. Myanmar
                writes both longer - "တနင်္လာ-သောကြာ" beside "နံနက် 9:00–ညနေ
                6:00" - and at 320px something has to give. It is this: a day
                name over two lines still reads, a time range split across
                them does not. */}
            <th scope="row" className="py-1.5 pr-2 text-left align-top font-normal text-[var(--color-muted)] sm:whitespace-nowrap sm:pr-4">
              {first === last
                ? dayLabel(locale, first)
                : `${dayLabel(locale, first)}–${dayLabel(locale, last)}`}
            </th>
            <td className="py-1.5 text-right align-top tabular-nums">
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
        ))}
      </tbody>
    </table>
  )
}
