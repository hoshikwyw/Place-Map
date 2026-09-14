import { useInfiniteQuery } from '@tanstack/react-query'
import { Stack, useLocalSearchParams } from 'expo-router'
import { fetchCategoryPlaces, nextPage } from '../../src/api'
import { PlaceList } from '../../src/components/place-list'
import { useI18n } from '../../src/i18n'

export default function CategoryScreen() {
  // `name` rides along from the tap that opened this screen, so the title is
  // right immediately instead of waiting for a request.
  const { slug, name } = useLocalSearchParams<{ slug: string; name?: string }>()
  const { locale, text } = useI18n()

  const query = useInfiniteQuery({
    queryKey: ['category', slug, locale],
    queryFn: ({ pageParam }) => fetchCategoryPlaces(locale, slug, pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPage,
  })

  return (
    <>
      <Stack.Screen options={{ title: name ?? '' }} />
      <PlaceList query={query} emptyMessage={text.emptyCategory} />
    </>
  )
}
