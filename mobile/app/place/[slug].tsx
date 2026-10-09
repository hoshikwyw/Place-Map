import { useQuery } from '@tanstack/react-query'
import { Image } from 'expo-image'
import { Stack, useLocalSearchParams } from 'expo-router'
import { Linking, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { LINK_LABELS, type Place } from '@place-map/shared'
import { fetchAmenities, fetchPlace } from '../../src/api'
import { Amenities } from '../../src/components/amenities'
import { HoursTable } from '../../src/components/hours-table'
import { OpenNow } from '../../src/components/open-now'
import { Price } from '../../src/components/price'
import { Rating } from '../../src/components/rating'
import { ErrorState, Loading, StaleNotice } from '../../src/components/states'
import { Text } from '../../src/components/text'
import { useI18n } from '../../src/i18n'
import { radius, useTheme, type Theme } from '../../src/theme'

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

/**
 * The platform's name rather than its logo, as on the website: logos are
 * trademarks with their own rules, and a name is legible to someone who does
 * not recognise a glyph.
 */
/** Pill buttons, as on the website: one filled primary action, the rest outlined. */
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
        { transform: [{ scale: pressed ? 0.97 : 1 }] },
      ]}
    >
      <Text weight="bold" tone={primary ? 'onAccent' : 'text'} style={styles.actionText}>
        {label}
      </Text>
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

  /**
   * The catalog a place's amenity slugs resolve against. Its own query, not
   * part of the place's: it is the same list for every place, so one copy is
   * cached and reused rather than refetched per screen, and it is kept an hour
   * because a catalog changes when somebody edits the dashboard, not when a
   * place does.
   *
   * It is also allowed to fail on its own. Losing it costs a row of chips, not
   * the address and the opening hours.
   */
  const catalog = useQuery({
    queryKey: ['amenities', locale],
    queryFn: () => fetchAmenities(locale),
    staleTime: 60 * 60_000,
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
  const hasDetails = Boolean(place.address || place.opening_hours)

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
            style={[styles.cover, { backgroundColor: theme.tintSoft }]}
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
                style={[styles.thumb, { backgroundColor: theme.tintSoft }]}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            ))}
          </ScrollView>
        )}

        <View style={styles.section}>
          <View style={[styles.categoryChip, { backgroundColor: theme.accentSoft }]}>
            <Text weight="bold" tone="accent" style={styles.categoryText}>
              {place.category.icon} {place.category.name}
            </Text>
          </View>
          <Text weight="bold" style={styles.name}>
            {place.name}
          </Text>
          <View style={styles.metaRow}>
            <OpenNow hours={place.opening_hours} />
            <Rating rating={place.rating} count={place.rating_count} size={15} />
          </View>
          {/* Under the name with the rest of what somebody decides on, as on
              the website. */}
          <Price price={place.price} />
        </View>

        <View style={[styles.section, styles.actions]}>
          {place.location && <Action primary label={text.directions} onPress={() => openDirections(place)} theme={theme} />}
          {place.phone && (
            <Action label={text.call} onPress={() => Linking.openURL(`tel:${place.phone!.replace(/\s+/g, '')}`)} theme={theme} />
          )}
          {place.website && <Action label={text.website} onPress={() => Linking.openURL(place.website!)} theme={theme} />}
          {place.links.map((link) => (
            <Action
              key={`${link.type}-${link.url}`}
              label={link.label || LINK_LABELS[link.type]}
              onPress={() => Linking.openURL(link.url)}
              theme={theme}
            />
          ))}
        </View>

        {place.description && (
          <View style={styles.section}>
            <Text style={styles.description}>{place.description}</Text>
          </View>
        )}

        {/* Renders nothing at all - heading included - when the place has no
            amenities, or when the catalog could not be fetched. */}
        <Amenities amenities={place.amenities} catalog={catalog.data ?? []} label={text.amenities} />

        {hasDetails && (
          <View style={[styles.detailsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {place.address && (
              <View style={styles.detail}>
                <Text weight="bold" tone="muted" style={styles.label}>
                  {text.address}
                </Text>
                <Text selectable style={styles.value}>
                  {place.address}
                </Text>
              </View>
            )}

            {place.opening_hours && (
              <View style={styles.detail}>
                <Text weight="bold" tone="muted" style={styles.label}>
                  {text.hours}
                </Text>
                <HoursTable hours={place.opening_hours} />
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  content: { paddingBottom: 40 },
  cover: { marginHorizontal: 16, marginTop: 8, aspectRatio: 3 / 2, borderRadius: radius.xl },
  gallery: { gap: 8, paddingHorizontal: 16, paddingTop: 10 },
  thumb: { width: 120, height: 80, borderRadius: radius.md },
  section: { paddingHorizontal: 16, paddingTop: 16, gap: 8 },
  categoryChip: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill },
  categoryText: { fontSize: 13 },
  name: { fontSize: 30, lineHeight: 36 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: { paddingHorizontal: 20, paddingVertical: 11, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth },
  actionText: { fontSize: 15 },
  description: { fontSize: 16, lineHeight: 24 },
  detailsCard: {
    marginHorizontal: 16,
    marginTop: 20,
    padding: 16,
    gap: 18,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  detail: { gap: 6 },
  label: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 },
  value: { fontSize: 16, lineHeight: 22 },
})
