import { StyleSheet, View } from 'react-native'
import { useI18n } from '../i18n'
import { useTheme } from '../theme'
import { Text } from './text'

/**
 * A place's rating, drawn the same way as on the website: one star, the number,
 * and how many ratings it covers. Nothing at all when a place is unrated - a
 * row of empty stars reads as "rated badly" rather than "not rated yet".
 */
export function Rating({
  rating,
  count,
  size = 14,
}: {
  /** Undefined as well as null: a cached response from before ratings existed
   *  has no such field, and that must not crash a screen. */
  rating: number | null | undefined
  count: number | null | undefined
  size?: number
}) {
  const theme = useTheme()
  const { text } = useI18n()
  const score = Number(rating)
  const total = Number.isFinite(Number(count)) ? Number(count) : 0
  if (rating == null || !Number.isFinite(score)) return null

  return (
    <View style={styles.row} accessibilityLabel={text.ratingLabel(score.toFixed(1), total)}>
      <Text style={[styles.star, { color: theme.star, fontSize: size }]}>★</Text>
      <Text weight="bold" style={{ fontSize: size }}>
        {score.toFixed(1)}
      </Text>
      {total > 0 && (
        <Text weight="semibold" tone="muted" style={{ fontSize: size - 1 }}>
          ({total})
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  // The star glyph sits slightly high next to digits.
  star: { marginTop: -1 },
})
