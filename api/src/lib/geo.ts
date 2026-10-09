/**
 * Distances without PostGIS. At a few hundred places the Worker can measure
 * every candidate itself; the database only narrows them to a bounding box.
 *
 * The measuring itself lives in @place-map/shared, so the website sorts by
 * exactly the same distance this does.
 */
export { distanceMeters } from '@place-map/shared'

const KM_PER_DEGREE_LAT = 111.32

const toRadians = (degrees: number) => (degrees * Math.PI) / 180

export interface Point {
  lat: number
  lng: number
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
