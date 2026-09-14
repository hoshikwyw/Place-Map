import { useInfiniteQuery } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import { nextPage, searchPlaces } from '../src/api'
import { PlaceList } from '../src/components/place-list'
import { Empty } from '../src/components/states'
import { useI18n } from '../src/i18n'
import { useTheme } from '../src/theme'

/**
 * Searches on submit, not on every keystroke - the same as the web app. Each
 * keystroke would be a Worker request against a 100K/day budget, and a
 * half-typed word rarely matches anything anyway.
 */
export default function SearchScreen() {
  const theme = useTheme()
  const { locale, text } = useI18n()
  const params = useLocalSearchParams<{ q?: string }>()
  const q = (params.q ?? '').trim()
  const [draft, setDraft] = useState(q)

  const query = useInfiniteQuery({
    queryKey: ['search', q, locale],
    queryFn: ({ pageParam }) => searchPlaces(locale, q, pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPage,
    enabled: q.length >= 2,
  })

  const input = (
    <View style={styles.header}>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        // The query lives in the route params, so Back returns to the previous
        // search rather than to an empty box.
        onSubmitEditing={() => router.setParams({ q: draft.trim() })}
        placeholder={text.searchPlaceholder}
        placeholderTextColor={theme.muted}
        returnKeyType="search"
        autoFocus={!q}
        autoCorrect={false}
        accessibilityLabel={text.search}
        style={[styles.search, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
      />
    </View>
  )

  if (q.length < 2) {
    return (
      <View style={{ flex: 1 }}>
        {input}
        {q.length > 0 && <Empty message={text.queryTooShort} />}
      </View>
    )
  }

  return (
    <View style={{ flex: 1 }}>
      {input}
      <PlaceList
        query={query}
        emptyMessage={text.noResults(q)}
        header={
          query.data ? (
            <Text style={[styles.count, { color: theme.muted }]}>
              {text.places(query.data.pages[0]?.meta.total ?? 0)}
            </Text>
          ) : undefined
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  search: { fontSize: 16, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
  count: { fontSize: 14, paddingHorizontal: 16, paddingTop: 8 },
})
