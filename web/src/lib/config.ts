import 'server-only'

function siteUrl(): string {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, '')
  // Set automatically on Vercel; keeps sitemap and canonical links absolute
  // before a custom domain exists.
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  return 'http://localhost:3000'
}

export const config = {
  get apiUrl(): string {
    const value = process.env.PLACE_MAP_API_URL
    if (!value) throw new Error('Missing PLACE_MAP_API_URL')
    return value.replace(/\/+$/, '')
  },
  get siteUrl(): string {
    return siteUrl()
  },
  /** The places' own zone. "Open now" is meaningless in UTC or the visitor's zone. */
  get timeZone(): string {
    return process.env.TIMEZONE ?? 'Asia/Tashkent'
  },
}

/**
 * How long a rendered page and its API responses are reused before being
 * refreshed. Matches the API's own max-age for places, so an admin edit
 * reaches the site within about five minutes without the site hammering the
 * Worker's daily request budget.
 */
export const REVALIDATE_SECONDS = 300
