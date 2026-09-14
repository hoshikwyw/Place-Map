import AsyncStorage from '@react-native-async-storage/async-storage'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { QueryClient } from '@tanstack/react-query'
import { NotFoundError } from './api'
import { FRESH_MS } from './config'

/**
 * Saved results are kept for a day and restored on launch, so the app opens
 * with content instead of a spinner and keeps working underground or on a
 * plane - it shows the last good copy and refreshes when it can.
 */
export const PERSIST_MAX_AGE = 24 * 60 * 60_000

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: FRESH_MS,
      // Must be at least the persist age: TanStack drops restored queries whose
      // gcTime has already elapsed, which would quietly empty the offline cache.
      gcTime: PERSIST_MAX_AGE,
      // Serve what is cached first, then try the network - rather than
      // refusing to show anything until a request succeeds.
      networkMode: 'offlineFirst',
      // A place that is gone stays gone; retrying a 404 only delays saying so.
      retry: (failures, error) => !(error instanceof NotFoundError) && failures < 2,
    },
  },
})

export const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'place-map:query-cache',
  // Writes are batched; a list that is scrolled fast does not rewrite storage
  // on every page.
  throttleTime: 1000,
})
