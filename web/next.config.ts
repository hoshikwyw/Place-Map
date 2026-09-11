import type { NextConfig } from 'next'

const config: NextConfig = {
  // @place-map/shared is published as TypeScript source, not built output.
  transpilePackages: ['@place-map/shared'],

  // Images are already resized to 1200px WebP under 200 KB before they reach
  // the CDN (Part 3). Running them through Vercel's optimiser as well would
  // spend a metered free-tier quota to re-compress files that are already
  // small, so they are served straight from ImageKit.
  images: { unoptimized: true },
}

export default config
