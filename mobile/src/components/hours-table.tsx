import { StyleSheet, View } from 'react-native'
import { groupHours, type OpeningHours } from '@place-map/shared'
import { dayLabel, useI18n } from '../i18n'
import { useTheme } from '../theme'
import { Text } from './text'

/**
 * The same grouping as the bot's caption and the web page - "Mon-Fri 09:00-18:00"
 * rather than seven rows - from @place-map/shared, so the three never disagree.
 */
export function HoursTable({ hours }: { hours: OpeningHours | null }) {
  const theme = useTheme()
  const { locale, text } = useI18n()
  const groups = groupHours(hours)
  if (!groups) return null

  return (
    <View>
      {groups.map(({ first, last, ranges }, index) => (
        <View
          key={first}
          style={[
            styles.row,
            index < groups.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.border },
          ]}
        >
          <Text tone="muted" style={styles.days}>
            {first === last ? dayLabel(locale, first) : `${dayLabel(locale, first)} - ${dayLabel(locale, last)}`}
          </Text>
          <Text weight="semibold" tone={ranges.length ? 'text' : 'muted'} style={styles.times}>
            {/* One range per line, as on the website: a comma-joined split
                shift wraps mid-range next to long Myanmar weekday names. */}
            {ranges.length ? ranges.map(([open, close]) => `${open}-${close}`).join('\n') : text.closed}
          </Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 8 },
  days: { fontSize: 15 },
  // Tabular figures keep the times lined up down the column.
  times: { fontSize: 15, fontVariant: ['tabular-nums'], textAlign: 'right', flexShrink: 1 },
})
