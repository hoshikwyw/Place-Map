import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query'
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native'
import type { ListResponse, PlaceSummary } from '@place-map/shared'
import { useTheme } from '../theme'
import { PlaceRow } from './place-row'
import { Empty, ErrorState, Loading, StaleNotice } from './states'

type Query = UseInfiniteQueryResult<InfiniteData<ListResponse<PlaceSummary>>>

/**
 * One paginated list for both a category and search results: loading, error,
 * empty, pull-to-refresh and "load more near the end", written once.
 */
export function PlaceList({
  query,
  emptyMessage,
  header,
}: {
  query: Query
  emptyMessage: string
  header?: React.ReactElement
}) {
  const theme = useTheme()
  const { data, error, isPending, isError, isRefetching, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } = query

  if (isPending) return <Loading />
  // Only a failure with nothing cached replaces the list. With cached pages,
  // the list stays and a notice says it could not be refreshed.
  if (isError && !data) return <ErrorState error={error} onRetry={() => refetch()} />

  const places = data?.pages.flatMap((page) => page.data) ?? []

  return (
    <FlatList
      data={places}
      keyExtractor={(place) => String(place.id)}
      renderItem={({ item }) => <PlaceRow place={item} />}
      ListHeaderComponent={
        <>
          {header}
          {isError && <StaleNotice />}
        </>
      }
      ListEmptyComponent={<Empty message={emptyMessage} />}
      ListFooterComponent={
        isFetchingNextPage ? (
          <View style={{ padding: 16 }}>
            <ActivityIndicator color={theme.accent} />
          </View>
        ) : null
      }
      // Start the next page when half a screen from the end, so scrolling
      // rarely reaches the spinner.
      onEndReachedThreshold={0.5}
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) fetchNextPage()
      }}
      refreshControl={
        <RefreshControl refreshing={isRefetching && !isFetchingNextPage} onRefresh={() => refetch()} tintColor={theme.accent} />
      }
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
    />
  )
}
