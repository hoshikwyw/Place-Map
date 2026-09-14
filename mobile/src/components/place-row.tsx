import { Image } from 'expo-image'
import { Link } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { PlaceSummary } from '@place-map/shared'
import { useTheme } from '../theme'
import { OpenNow } from './open-now'

export function PlaceRow({ place }: { place: PlaceSummary }) {
  const theme = useTheme()
  const subtitle = place.address ?? place.category.name

  return (
    <Link href={{ pathname: '/place/[slug]', params: { slug: place.slug, name: place.name } }} asChild>
      <Pressable
        accessibilityRole="link"
        style={({ pressed }) => [styles.row, { borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}
      >
        <View style={[styles.thumb, { backgroundColor: theme.surface }]}>
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
            <Text style={styles.icon}>{place.category.icon ?? '·'}</Text>
          )}
        </View>

        <View style={styles.body}>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
            {place.name}
          </Text>
          <Text style={[styles.subtitle, { color: theme.muted }]} numberOfLines={1}>
            {subtitle}
          </Text>
          <OpenNow hours={place.opening_hours} compact />
        </View>
      </Pressable>
    </Link>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 26 },
  body: { flex: 1, justifyContent: 'center', gap: 3 },
  name: { fontSize: 16, fontWeight: '600' },
  subtitle: { fontSize: 14 },
})
