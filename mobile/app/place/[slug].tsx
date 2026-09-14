import { useQuery } from '@tanstack/react-query'
import { Image } from 'expo-image'
import { Stack, useLocalSearchParams } from 'expo-router'
import { Linking, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import type { Place } from '@place-map/shared'
import { fetchPlace } from '../../src/api'
import { HoursTable } from '../../src/components/hours-table'
import { OpenNow } from '../../src/components/open-now'
import { ErrorState, Loading, StaleNotice } from '../../src/components/states'
import { useI18n } from '../../src/i18n'
import { useTheme, type Theme } from '../../src/theme'

/**
 * Directions hand off to the phone's own maps app rather than an in-app map.
 *
 * An embedded map means either Google Maps (needs a billing account, which
 * needs a card) or MapLibre (native code, so no Expo Go - every tester would
 * need a custom build). The native app is also simply better at directions.
 * On Android `geo:` opens the user's choice - Google Maps, Yandex, 2GIS; the
 * web URL is the fallback when nothing handles the native scheme.
 */
function openDirections(place: Place) {
  if (!place.location) return
  const { lat, lng } = place.location
  const label = encodeURIComponent(place.name)
  const web = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
  const native = Platform.select({
    ios: `maps:?daddr=${lat},${lng}&q=${label}`,
    android: `geo:${lat},${lng}?q=${lat},${lng}(${label})`,
  })
  ;(native ? Linking.openURL(native) : Promise.reject()).catch(() => Linking.openURL(web))
}

function Action({ label, onPress, theme, primary = false }: { label: string; onPress: () => void; theme: Theme; primary?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        primary
          ? { backgroundColor: theme.accent, borderColor: theme.accent }
          : { backgroundColor: theme.surface, borderColor: theme.border },
        { opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <Text style={[styles.actionText, { color: primary ? theme.onAccent : theme.text }]}>{label}</Text>
    </Pressable>
  )
}

export default function PlaceScreen() {
  const { slug, name } = useLocalSearchParams<{ slug: string; name?: string }>()
  const theme = useTheme()
  const { locale, text } = useI18n()

  const query = useQuery({
    queryKey: ['place', slug, locale],
    queryFn: () => fetchPlace(locale, slug),
  })

  const title = query.data?.name ?? name ?? ''

  if (query.isPending) {
    return (
      <>
        <Stack.Screen options={{ title }} />
        <Loading />
      </>
    )
  }

  if (query.isError && !query.data) {
    return (
      <>
        <Stack.Screen options={{ title }} />
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      </>
    )
  }

  const place = query.data
  const [cover, ...gallery] = place.images

  return (
    <>
      <Stack.Screen options={{ title }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor={theme.accent} />}
        contentContainerStyle={styles.content}
      >
        {query.isError && <StaleNotice />}

        {cover && (
          <Image
            source={cover.url}
            style={[styles.cover, { backgroundColor: theme.surface }]}
            contentFit="cover"
            cachePolicy="memory-disk"
            accessibilityLabel={place.name}
            transition={150}
          />
        )}

        {gallery.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gallery}>
            {gallery.map((image) => (
              <Image
                key={image.url}
                source={image.url}
                style={[styles.thumb, { backgroundColor: theme.surface }]}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            ))}
          </ScrollView>
        )}

        <View style={styles.section}>
          <Text style={[styles.category, { color: theme.muted }]}>
            {place.category.icon} {place.category.name}
          </Text>
          <Text style={[styles.name, { color: theme.text }]}>{place.name}</Text>
          <OpenNow hours={place.opening_hours} />
        </View>

        <View style={[styles.section, styles.actions]}>
          {place.location && <Action primary label={text.directions} onPress={() => openDirections(place)} theme={theme} />}
          {place.phone && (
            <Action label={text.call} onPress={() => Linking.openURL(`tel:${place.phone!.replace(/\s+/g, '')}`)} theme={theme} />
          )}
          {place.website && <Action label={text.website} onPress={() => Linking.openURL(place.website!)} theme={theme} />}
        </View>

        {place.description && (
          <Text style={[styles.section, styles.description, { color: theme.text }]}>{place.description}</Text>
        )}

        {place.address && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.muted }]}>{text.address}</Text>
            <Text selectable style={[styles.value, { color: theme.text }]}>
              {place.address}
            </Text>
          </View>
        )}

        {place.opening_hours && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.muted }]}>{text.hours}</Text>
            <HoursTable hours={place.opening_hours} />
          </View>
        )}
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  cover: { width: '100%', aspectRatio: 3 / 2 },
  gallery: { gap: 8, paddingHorizontal: 16, paddingTop: 8 },
  thumb: { width: 120, height: 80, borderRadius: 8 },
  section: { paddingHorizontal: 16, paddingTop: 16, gap: 6 },
  category: { fontSize: 14 },
  name: { fontSize: 26, fontWeight: '700' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
  actionText: { fontSize: 15, fontWeight: '600' },
  description: { fontSize: 16, lineHeight: 23 },
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 16, lineHeight: 22 },
})
