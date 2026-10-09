import type { PlaceFilters } from '@place-map/shared'

/**
 * Narrowing a list of places by the attributes that do not move: how expensive
 * it is, and what it has.
 *
 * Applied in the database rather than the Worker so that paging stays honest -
 * filtering a page after it has been fetched gives a page of three results and
 * a total that claims forty.
 *
 * "Open now" and "nearest first" are deliberately not here. Both change
 * without the data changing - one with the clock, one with where the reader is
 * standing - so a cached response cannot carry them, and the clients apply
 * them to what they are given.
 */

/**
 * The two builder methods used here. Written out rather than taking the
 * builder's own type: that type is recursive and enormous, and threading it
 * through a generic sends the compiler chasing it until it gives up.
 */
interface Filterable {
  in(column: string, values: readonly (string | number)[]): Filterable
  contains(column: string, value: string): Filterable
}

export function applyPlaceFilters<Q>(query: Q, filters: PlaceFilters): Q {
  let filtered = query as Filterable

  if (filters.price?.length) {
    filtered = filtered.in('price_level', filters.price)
  }

  if (filters.amenities?.length) {
    // `contains`, not an overlap: a row of ticked boxes reads as "has wifi AND
    // parking", not "has either".
    //
    // Handed over as JSON text, not an array. The column is jsonb, and given
    // an array the client builds Postgres's own array literal - `cs.{wifi}` -
    // which the database rejects as invalid JSON.
    filtered = filtered.contains('amenities', JSON.stringify(filters.amenities))
  }

  // Every method above returns the same builder it was called on, so the
  // caller still holds what it passed in.
  return filtered as Q
}

/** True when a request asks for anything narrower than the whole list. */
export function hasPlaceFilters(filters: PlaceFilters): boolean {
  return Boolean(filters.price?.length || filters.amenities?.length)
}

/**
 * Part of a cache key, so a filtered list can never be served to someone who
 * asked for the unfiltered one. Sorted, so the same filters in a different
 * order are the same key rather than a second copy.
 */
export function filterKey(filters: PlaceFilters): string {
  const price = [...(filters.price ?? [])].sort((a, b) => a - b).join('.')
  const amenities = [...(filters.amenities ?? [])].sort().join('.')
  return `${price}|${amenities}`
}
