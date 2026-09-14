import { useQuery } from '@tanstack/react-query'
import { Link, router } from 'expo-router'
import { useState } from 'react'
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native'
import { fetchCategories } from '../src/api'
import { ErrorState, Loading, StaleNotice } from '../src/components/states'
import { useI18n } from '../src/i18n'
import { useTheme } from '../src/theme'

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
          <Text style={[styles.tagline, { color: theme.muted }]}>{text.tagline}</Text>
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
          <Text style={[styles.heading, { color: theme.text }]}>{text.categories}</Text>
        </View>
      }
      renderItem={({ item }) => (
        <Link href={{ pathname: '/category/[slug]', params: { slug: item.slug, name: item.name } }} asChild>
          <Pressable
            accessibilityRole="link"
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={styles.icon}>{item.icon ?? '·'}</Text>
            <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>
              {item.name}
            </Text>
          </Pressable>
        </Link>
      )}
    />
  )
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  columns: { gap: 12 },
  header: { gap: 12, marginBottom: 4 },
  tagline: { fontSize: 15, lineHeight: 21 },
  search: { fontSize: 16, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
  heading: { fontSize: 20, fontWeight: '700', marginTop: 8 },
  card: { flex: 1, minHeight: 96, padding: 14, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, justifyContent: 'space-between' },
  icon: { fontSize: 28 },
  name: { fontSize: 16, fontWeight: '600' },
})
