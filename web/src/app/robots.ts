import type { MetadataRoute } from 'next'
import { config } from '@/lib/config'

export default function robots(): MetadataRoute.Robots {
  return {
    // Search pages are crawlable - their links lead to place pages - but carry
    // a noindex of their own, so they never compete with those pages.
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${config.siteUrl}/sitemap.xml`,
  }
}
