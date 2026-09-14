import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native'
import { NotFoundError } from '../api'
import { useI18n } from '../i18n'
import { radius, useTheme } from '../theme'
import { Mascot } from './mascot'
import { Text } from './text'

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
      <Mascot size={112} style={styles.mascot} />
      <Text weight="extrabold" style={styles.title}>
        {notFound ? text.notFoundTitle : text.errorTitle}
      </Text>
      <Text tone="muted" style={styles.body}>
        {notFound ? text.notFoundBody : text.errorBody}
      </Text>
      {!notFound && (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={({ pressed }) => [styles.button, { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}
        >
          <Text weight="bold" tone="onAccent" style={styles.buttonText}>
            {text.tryAgain}
          </Text>
        </Pressable>
      )}
    </View>
  )
}

export function Empty({ message }: { message: string }) {
  return (
    <View style={styles.center}>
      <Mascot size={96} style={styles.mascot} />
      <Text tone="muted" style={styles.body}>
        {message}
      </Text>
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
    <View style={[styles.notice, { backgroundColor: theme.coralSoft }]}>
      <Text weight="semibold" tone="coral" style={styles.noticeText}>
        {text.staleNotice}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  mascot: { marginBottom: 8 },
  title: { fontSize: 22, textAlign: 'center' },
  body: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  button: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.pill },
  buttonText: { fontSize: 15 },
  notice: { marginHorizontal: 16, marginTop: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.md },
  noticeText: { fontSize: 13, textAlign: 'center' },
})
