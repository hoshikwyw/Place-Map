import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { NotFoundError } from '../api'
import { useI18n } from '../i18n'
import { useTheme } from '../theme'

export function Loading() {
  const theme = useTheme()
  return (
    <View style={styles.center}>
      <ActivityIndicator color={theme.accent} />
    </View>
  )
}

/**
 * A failed load with nothing cached. A 404 gets its own wording and no retry
 * button - trying again will not bring a deleted place back.
 */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const theme = useTheme()
  const { text } = useI18n()
  const notFound = error instanceof NotFoundError

  return (
    <View style={styles.center}>
      <Text style={[styles.title, { color: theme.text }]}>
        {notFound ? text.notFoundTitle : text.errorTitle}
      </Text>
      <Text style={[styles.body, { color: theme.muted }]}>
        {notFound ? text.notFoundBody : text.errorBody}
      </Text>
      {!notFound && (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={({ pressed }) => [styles.button, { backgroundColor: theme.accent, opacity: pressed ? 0.8 : 1 }]}
        >
          <Text style={[styles.buttonText, { color: theme.onAccent }]}>{text.tryAgain}</Text>
        </Pressable>
      )}
    </View>
  )
}

export function Empty({ message }: { message: string }) {
  const theme = useTheme()
  return (
    <View style={styles.center}>
      <Text style={[styles.body, { color: theme.muted }]}>{message}</Text>
    </View>
  )
}

/**
 * Shown above cached content when a refresh failed. The data on screen is
 * still useful; saying it may be out of date is more honest than hiding it or
 * replacing it with an error.
 */
export function StaleNotice() {
  const theme = useTheme()
  const { text } = useI18n()
  return (
    <View style={[styles.notice, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.noticeText, { color: theme.muted }]}>{text.staleNotice}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  title: { fontSize: 18, fontWeight: '600', textAlign: 'center' },
  body: { fontSize: 15, textAlign: 'center', lineHeight: 21 },
  button: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  buttonText: { fontSize: 15, fontWeight: '600' },
  notice: { marginHorizontal: 16, marginTop: 12, padding: 10, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth },
  noticeText: { fontSize: 13, textAlign: 'center' },
})
