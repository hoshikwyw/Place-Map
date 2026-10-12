'use server'

import { isFetchableMapHost, parseMapLink, type Coordinates } from '@/lib/map-link'
import { requireSession } from '@/lib/auth'

/**
 * Opens a shortened map link far enough to read the coordinates out of it.
 *
 * The Google Maps app's share button produces `maps.app.goo.gl/AbCdEfGh`,
 * which carries an id and nothing else - so it is the link most likely to be
 * pasted and the one a browser cannot read, since following it is a
 * cross-origin request Google does not allow. The server can.
 *
 * Two things keep this from being a general-purpose fetcher pointed at
 * whatever somebody sends:
 *
 * - Only map hosts, checked at **every** redirect hop rather than only the
 *   first. A short link redirects, and an allowlist that checks the first URL
 *   alone is no allowlist at all.
 * - A hop limit and a timeout, so a redirect loop or a slow host occupies this
 *   server briefly rather than indefinitely.
 *
 * It is a server action, so it re-checks the session: the guard on the page
 * that rendered the form is not a guard on the POST.
 */

const MAX_HOPS = 5
const TIMEOUT_MS = 8000

export type ResolveResult =
  | { coordinates: Coordinates; error?: undefined }
  | { coordinates?: undefined; error: string }

export async function resolveMapLink(link: string): Promise<ResolveResult> {
  await requireSession()

  const trimmed = (link ?? '').trim()
  if (!trimmed) return { error: 'Paste a link first' }

  // Already readable: no request needed, and the common case.
  const direct = parseMapLink(trimmed)
  if (direct) return { coordinates: direct }

  if (!isFetchableMapHost(trimmed)) {
    return { error: 'That does not look like a map link' }
  }

  let url = trimmed
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    for (let hop = 0; hop < MAX_HOPS; hop++) {
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        // Google serves a different, coordinate-free page to clients it does
        // not recognise, so this asks the way a browser would.
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
          'Accept-Language': 'en',
        },
      })

      const location = response.headers.get('location')
      if (location) {
        const next = new URL(location, url).toString()
        // Checked again: the first host being allowed says nothing about
        // where it is sending us.
        if (!isFetchableMapHost(next)) {
          return { error: 'That link redirects somewhere unexpected' }
        }

        const fromUrl = parseMapLink(next)
        if (fromUrl) return { coordinates: fromUrl }

        url = next
        continue
      }

      // No redirect left: the coordinates are in the final URL, or in the page.
      const fromFinal = parseMapLink(response.url || url)
      if (fromFinal) return { coordinates: fromFinal }

      const body = await response.text()
      const fromBody = parseMapLink(body)
      if (fromBody) return { coordinates: fromBody }

      return { error: 'Opened the link, but found no coordinates in it' }
    }

    return { error: 'That link redirects too many times' }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { error: 'The map took too long to answer' }
    }
    return { error: 'Could not open that link' }
  } finally {
    clearTimeout(timer)
  }
}
