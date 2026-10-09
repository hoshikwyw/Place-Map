import { StyleSheet, View } from 'react-native'
import { priceParts, type Price as PriceValue, type PriceWords } from '@place-map/shared'
import { useI18n } from '../i18n'
import { Text } from './text'

/**
 * What a visit costs: a word for how expensive the place is, and an exact
 * range when it has one. Either half may be missing.
 *
 * The wording decisions live in @place-map/shared, so this says exactly what
 * the website and the bot say about the same place. Here it only supplies the
 * app's own words and lays the parts out.
 *
 * The level is a word rather than a row of currency symbols: "₭₭" means
 * nothing without knowing the scale, and a screen reader reads it as noise.
 */
export function Price({
  price,
  size = 15,
  compact = false,
}: {
  /** Undefined as well as null: a cached response from before the price column
   *  existed has no such field, and that must not crash a screen. */
  price: PriceValue | null | undefined
  size?: number
  /** For a list row: the level alone, which is the part that compares across
   *  places - what somebody scanning a list is doing. */
  compact?: boolean
}) {
  const { text } = useI18n()

  const words: PriceWords = {
    levels: text.priceLevels,
    money: text.money,
    from: text.priceFrom,
    upTo: text.priceUpTo,
  }

  const parts = priceParts(price, words)
  if (!parts) return null

  if (compact) {
    return (
      <Text weight="bold" tone="muted" style={{ fontSize: size }}>
        {parts.level ?? parts.range}
      </Text>
    )
  }

  return (
    <View style={styles.row}>
      {parts.level && (
        <Text weight="bold" style={{ fontSize: size }}>
          {parts.level}
        </Text>
      )}
      {parts.range && (
        <Text tone="muted" style={{ fontSize: size }}>
          {parts.range} {text.perPerson}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
})
