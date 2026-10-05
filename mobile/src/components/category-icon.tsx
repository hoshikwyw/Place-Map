import { Image } from 'expo-image'
import { StyleSheet } from 'react-native'
import type { Category } from '@place-map/shared'
import { Text } from './text'

/**
 * A category's picture if it has one, its emoji otherwise - the same rule as
 * the website, so the two never disagree about what a category looks like.
 */
export function CategoryIcon({
  category,
  size,
}: {
  category: Pick<Category, 'icon' | 'icon_image'>
  size: number
}) {
  if (category.icon_image) {
    return (
      <Image
        source={{ uri: category.icon_image }}
        style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
    )
  }

  // The emoji is drawn as text, so it needs a size rather than a box.
  return <Text style={{ fontSize: Math.round(size * 0.82) }}>{category.icon ?? '📍'}</Text>
}

const styles = StyleSheet.create({
  image: { backgroundColor: 'transparent' },
})
