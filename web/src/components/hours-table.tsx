import { groupHours, type OpeningHours } from '@place-map/shared'
import { dayLabel, t, type Locale } from '@/lib/i18n'

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
            <th scope="row" className="whitespace-nowrap py-1.5 pr-4 text-left align-top font-normal text-[var(--color-muted)]">
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
                      {open}–{close}
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
