import { Image } from 'expo-image'
import { Link } from 'expo-router'
import { Pressable, StyleSheet, View } from 'react-native'
import type { PlaceSummary } from '@place-map/shared'
import { radius, useTheme } from '../theme'
import { OpenNow } from './open-now'
import { Text } from './text'

/** A rounded card per place, matching the website's place cards. */
export function PlaceRow({ place }: { place: PlaceSummary }) {
  const theme = useTheme()
  const subtitle = place.address ?? place.category.name

  return (
    <Link href={{ pathname: '/place/[slug]', params: { slug: place.slug, name: place.name } }} asChild>
      <Pressable
        accessibilityRole="link"
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
      >
        <View style={[styles.thumb, { backgroundColor: theme.coralSoft }]}>
          {place.image ? (
            <Image
              source={place.image.url}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              // Kept on disk, so the list still has pictures offline.
              cachePolicy="memory-disk"
              transition={150}
            />
          ) : (
            <Text style={styles.icon}>{place.category.icon ?? '📍'}</Text>
          )}
        </View>

        <View style={styles.body}>
          <Text weight="bold" style={styles.name} numberOfLines={1}>
            {place.name}
          </Text>
          <Text tone="muted" style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
          <OpenNow hours={place.opening_hours} compact />
        </View>
      </Pressable>
    </Link>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 14,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 30 },
  body: { flex: 1, justifyContent: 'center', gap: 4 },
  name: { fontSize: 16 },
  subtitle: { fontSize: 14 },
})
