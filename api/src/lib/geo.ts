/**
 * Distances without PostGIS. At a few hundred places the Worker can measure
 * every candidate itself; the database only narrows them to a bounding box.
 */

const EARTH_RADIUS_M = 6_371_000
const KM_PER_DEGREE_LAT = 111.32

const toRadians = (degrees: number) => (degrees * Math.PI) / 180

export interface Point {
  lat: number
  lng: number
}

/** Great-circle distance in metres. Accurate to well under 1% at city scale. */
export function distanceMeters(a: Point, b: Point): number {
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * A lat/lng box that contains every point within `radiusKm`. It is a superset -
 * the corners reach further than the radius - so results are still filtered by
 * `distanceMeters` afterwards.
 */
export function boundingBox({ lat, lng }: Point, radiusKm: number) {
  const dLat = radiusKm / KM_PER_DEGREE_LAT
  // Longitude degrees shrink towards the poles. Clamp so the box stays finite.
  const dLng = radiusKm / (KM_PER_DEGREE_LAT * Math.max(Math.cos(toRadians(lat)), 0.01))
  return {
    minLat: Math.max(-90, lat - dLat),
    maxLat: Math.min(90, lat + dLat),
    minLng: Math.max(-180, lng - dLng),
    maxLng: Math.min(180, lng + dLng),
  }
}
