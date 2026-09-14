import { StyleSheet, Text, View } from 'react-native'
import { groupHours, type OpeningHours } from '@place-map/shared'
import { dayLabel, useI18n } from '../i18n'
import { useTheme } from '../theme'

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
    <View style={styles.table}>
      {groups.map(({ first, last, ranges }) => (
        <View key={first} style={styles.row}>
          <Text style={[styles.days, { color: theme.muted }]}>
            {first === last ? dayLabel(locale, first) : `${dayLabel(locale, first)} - ${dayLabel(locale, last)}`}
          </Text>
          <Text style={[styles.times, { color: ranges.length ? theme.text : theme.muted }]}>
            {ranges.length ? ranges.map(([open, close]) => `${open}-${close}`).join(', ') : text.closed}
          </Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  table: { gap: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  days: { fontSize: 15 },
  // Tabular figures keep the times lined up down the column.
  times: { fontSize: 15, fontVariant: ['tabular-nums'], textAlign: 'right', flexShrink: 1 },
})
