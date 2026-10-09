import { Image } from 'expo-image'
import { StyleSheet, View } from 'react-native'
import { resolveAmenities, type Amenity } from '@place-map/shared'
import { radius, useTheme } from '../theme'
import { Text } from './text'

/**
 * The things people check before going somewhere, as a row of chips.
 *
 * A place stores slugs; the catalog passed in supplies the names, in the
 * reader's language, and the order. The name is always shown - an icon on its
 * own is a guessing game, since a square with a car in it is not obviously
 * "parking" to everyone.
 *
 * Unlike the website there are no drawn icons here, only the uploaded image or
 * the emoji. Nine inline SVGs would mean adding react-native-svg, which is
 * native code and so would end Expo Go testing - a poor trade for an icon that
 * sits beside a word that already says it.
 */
export function Amenities({
  amenities,
  catalog,
  label,
}: {
  /** Slugs the place carries. A cached response predating the column has none. */
  amenities?: string[] | null
  catalog: Amenity[]
  label: string
}) {
  const theme = useTheme()

  const shown = resolveAmenities(amenities, catalog)
  if (shown.length === 0) return null

  // The heading belongs inside, with the chips: every caller would otherwise
  // have to repeat the two conditions above to avoid a heading over nothing.
  return (
    <View style={styles.section}>
      <Text weight="bold" tone="muted" style={styles.heading}>
        {label}
      </Text>
      <View style={styles.row}>
        {shown.map((amenity) => (
          <View
            key={amenity.slug}
            style={[styles.chip, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            {amenity.icon_image ? (
              <Image
                source={amenity.icon_image}
                style={styles.icon}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
            ) : amenity.icon ? (
              <Text style={styles.emoji}>{amenity.icon}</Text>
            ) : null}
            <Text style={styles.label}>{amenity.name}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: 16, paddingTop: 16, gap: 8 },
  heading: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  icon: { width: 16, height: 16 },
  emoji: { fontSize: 15, lineHeight: 18 },
  label: { fontSize: 14 },
})
