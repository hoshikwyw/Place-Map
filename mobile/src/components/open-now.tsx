import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { isOpenAt, type OpeningHours, type OpenState } from '@place-map/shared'
import { TIME_ZONE } from '../config'
import { useI18n } from '../i18n'
import { useTheme } from '../theme'

/**
 * The same isOpenAt the web app uses, judged in the places' time zone rather
 * than the phone's, and re-checked every minute so a screen left open does not
 * keep saying "open" after closing time.
 */
function openState(hours: OpeningHours | null): OpenState | null {
  try {
    return isOpenAt(hours, new Date(), TIME_ZONE)
  } catch {
    // isOpenAt relies on Intl time-zone support. If an engine ever lacks it,
    // showing no badge is right; showing a wrong one, or crashing, is not.
    return null
  }
}

export function OpenNow({ hours, compact = false }: { hours: OpeningHours | null; compact?: boolean }) {
  const theme = useTheme()
  const { text } = useI18n()
  const [state, setState] = useState(() => openState(hours))

  useEffect(() => {
    setState(openState(hours))
    const timer = setInterval(() => setState(openState(hours)), 60_000)
    return () => clearInterval(timer)
  }, [hours])

  if (!state) return null
  const color = state.open ? theme.open : theme.closed

  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]}>{state.open ? text.openNow : text.closedNow}</Text>
      {!compact && state.open && state.closesAt && (
        <Text style={[styles.detail, { color: theme.muted }]}>· {text.closesAt(state.closesAt)}</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  label: { fontSize: 13, fontWeight: '600' },
  detail: { fontSize: 13 },
})
