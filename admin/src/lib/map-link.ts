/**
 * Pulls coordinates out of a map link.
 *
 * Typing latitude and longitude by hand means reading them off a map, copying
 * two numbers in the right order, and not transposing a digit - and a
 * transposed digit puts a cafe in the Andaman Sea without anything looking
 * wrong on the form. Pasting the link somebody already has is fewer steps and
 * no chance to mistype.
 *
 * Pure, and separate from the component, because the only way to trust it is
 * to run it against the many shapes a map link comes in.
 */

export interface Coordinates {
  lat: number
  lng: number
}

/** Yangon is around 16.8, 96.15 - but a directory may grow, so only the real limits. */
function valid(lat: number, lng: number): Coordinates | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90) return null
  if (lng < -180 || lng > 180) return null
  return { lat, lng }
}

/** `16.7751` or `-16.7751`, and nothing that merely starts with a number. */
const NUMBER = String.raw`-?\d+(?:\.\d+)?`

/**
 * Every shape worth reading, most trustworthy first.
 *
 * Order matters. A Google place URL carries both the pin and the viewport, and
 * they are not the same point: `@` is where the map was centred when the link
 * was made, which can be a street away from the place itself. `!3d!4d` is the
 * pin. Reading `@` first would put every place slightly off, consistently, and
 * invisibly.
 */
const PATTERNS: { name: string; regex: RegExp }[] = [
  // The pin in a Google place URL, inside the `data=` blob.
  { name: 'google pin', regex: new RegExp(String.raw`!3d(${NUMBER})!4d(${NUMBER})`) },
  // Explicit query forms: ?q=, ?query=, &destination=, &daddr=
  {
    name: 'query',
    regex: new RegExp(String.raw`[?&](?:q|query|destination|daddr)=(${NUMBER})%2C\s*(${NUMBER})`, 'i'),
  },
  {
    name: 'query',
    regex: new RegExp(String.raw`[?&](?:q|query|destination|daddr)=(${NUMBER}),\s*(${NUMBER})`, 'i'),
  },
  // Apple Maps and others: ?ll=, &sll=, &center=
  {
    name: 'll',
    regex: new RegExp(String.raw`[?&](?:s?ll|center)=(${NUMBER}),\s*(${NUMBER})`, 'i'),
  },
  // OpenStreetMap: #map=17/16.7751/96.1605
  { name: 'osm', regex: new RegExp(String.raw`#map=\d+(?:\.\d+)?/(${NUMBER})/(${NUMBER})`) },
  // A geo: link, which is what Android share sheets produce.
  { name: 'geo', regex: new RegExp(String.raw`^geo:(${NUMBER}),(${NUMBER})`, 'i') },
  // The viewport centre of a Google maps URL. Last, for the reason above.
  { name: 'google viewport', regex: new RegExp(String.raw`@(${NUMBER}),(${NUMBER})`) },
  // Two bare numbers, which is what copying from almost any map gives you.
  { name: 'pair', regex: new RegExp(String.raw`^\s*(${NUMBER})\s*,\s*(${NUMBER})\s*$`) },
]

/**
 * Coordinates from a pasted link or a pasted pair, or null.
 *
 * Null covers both "this is not a map link" and "this is a short link that has
 * to be opened first" - `needsResolving` tells those apart.
 */
export function parseMapLink(value: string): Coordinates | null {
  const text = (value ?? '').trim()
  if (!text) return null

  // A URL may arrive percent-encoded, which hides the separators the patterns
  // look for. Try both, because decoding can also fail on a malformed escape.
  const candidates = [text]
  try {
    const decoded = decodeURIComponent(text)
    if (decoded !== text) candidates.push(decoded)
  } catch {
    // Left as-is; the raw form is still worth matching against.
  }

  for (const { regex } of PATTERNS) {
    for (const candidate of candidates) {
      const match = candidate.match(regex)
      if (!match) continue
      const found = valid(Number(match[1]), Number(match[2]))
      if (found) return found
    }
  }

  return null
}

/**
 * Hosts that hand out short links with no coordinates in them.
 *
 * This is the link the Google Maps app's share button actually produces, so it
 * is the one most likely to be pasted. It carries nothing but an id: the
 * coordinates only appear after following the redirect, which a browser cannot
 * do across origins - hence the server action.
 */
const SHORT_HOSTS = new Set([
  'maps.app.goo.gl',
  'goo.gl',
  'g.co',
  'maps.apple',
  'maps.apple.com',
])

/** Whether this link has to be opened on the server before it says anything. */
export function needsResolving(value: string): boolean {
  const text = (value ?? '').trim()
  if (!text) return false
  if (parseMapLink(text)) return false

  try {
    const url = new URL(text)
    return SHORT_HOSTS.has(url.hostname.toLowerCase())
  } catch {
    return false
  }
}

/**
 * Hosts the server will open, as an allowlist rather than a blocklist.
 *
 * This is the part that matters. A server action that fetches whatever it is
 * given is a way to ask this server to make requests on somebody's behalf -
 * at internal addresses a visitor cannot reach - so it opens map hosts and
 * nothing else, at every redirect hop rather than only the first.
 */
const FETCHABLE_HOSTS = new Set([
  'maps.app.goo.gl',
  'goo.gl',
  'g.co',
  'maps.google.com',
  'www.google.com',
  'google.com',
  'maps.apple.com',
  'www.openstreetmap.org',
  'openstreetmap.org',
])

export function isFetchableMapHost(value: string): boolean {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return false
    return FETCHABLE_HOSTS.has(url.hostname.toLowerCase())
  } catch {
    return false
  }
}
