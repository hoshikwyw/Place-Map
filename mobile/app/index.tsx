import { useQuery } from '@tanstack/react-query'
import { Link, router } from 'expo-router'
import { useState } from 'react'
import { FlatList, Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native'
import { fetchCategories } from '../src/api'
import { Mascot } from '../src/components/mascot'
import { ErrorState, Loading, StaleNotice } from '../src/components/states'
import { Text } from '../src/components/text'
import { useI18n } from '../src/i18n'
import { fonts, radius, useTheme } from '../src/theme'

export default function Home() {
  const theme = useTheme()
  const { locale, text } = useI18n()
  const [query, setQuery] = useState('')

  const categories = useQuery({
    // The locale is part of every key: switching language must never show a
    // cached list in the previous one.
    queryKey: ['categories', locale],
    queryFn: () => fetchCategories(locale),
  })

  const submit = () => {
    const q = query.trim()
    if (q.length >= 2) router.push({ pathname: '/search', params: { q } })
  }

  if (categories.isPending) return <Loading />
  if (categories.isError && !categories.data) {
    return <ErrorState error={categories.error} onRetry={() => categories.refetch()} />
  }

  return (
    <FlatList
      data={categories.data ?? []}
      keyExtractor={(category) => String(category.id)}
      numColumns={2}
      columnWrapperStyle={styles.columns}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl refreshing={categories.isRefetching} onRefresh={() => categories.refetch()} tintColor={theme.accent} />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.welcome}>
            <Mascot size={88} />
            <Text tone="muted" style={styles.tagline}>
              {text.tagline}
            </Text>
          </View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={submit}
            placeholder={text.searchPlaceholder}
            placeholderTextColor={theme.muted}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel={text.search}
            style={[styles.search, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
          />
          {categories.isError && <StaleNotice />}
          <Text weight="extrabold" style={styles.heading}>
            {text.categories}
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <Link href={{ pathname: '/category/[slug]', params: { slug: item.slug, name: item.name } }} asChild>
          <Pressable
            accessibilityRole="link"
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}
          >
            <View style={[styles.iconBubble, { backgroundColor: theme.coralSoft }]}>
              <Text style={styles.icon}>{item.icon ?? '📍'}</Text>
            </View>
            <Text weight="bold" style={styles.name} numberOfLines={2}>
              {item.name}
            </Text>
          </Pressable>
        </Link>
      )}
    />
  )
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  columns: { gap: 12 },
  header: { gap: 14, marginBottom: 4 },
  welcome: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  tagline: { flex: 1, fontSize: 15, lineHeight: 22 },
  search: {
    fontFamily: fonts.regular,
    fontSize: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  heading: { fontSize: 20, marginTop: 10 },
  card: {
    flex: 1,
    minHeight: 112,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'space-between',
    gap: 10,
  },
  iconBubble: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 24 },
  name: { fontSize: 16 },
})
