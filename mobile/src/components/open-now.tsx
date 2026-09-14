import { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { isOpenAt, type OpeningHours, type OpenState } from '@place-map/shared'
import { TIME_ZONE } from '../config'
import { useI18n } from '../i18n'
import { radius, useTheme } from '../theme'
import { Text } from './text'

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

/** A soft chip, as on the website: teal for open, the mascot's coral for closed. */
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
  const background = state.open ? theme.accentSoft : theme.coralSoft

  return (
    <View style={[styles.chip, { backgroundColor: background }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text weight="bold" style={[styles.label, { color }]}>
        {state.open ? text.openNow : text.closedNow}
      </Text>
      {!compact && state.open && state.closesAt && (
        <Text weight="semibold" style={[styles.label, styles.detail, { color }]}>
          · {text.closesAt(state.closesAt)}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontSize: 12 },
  detail: { opacity: 0.8 },
})
