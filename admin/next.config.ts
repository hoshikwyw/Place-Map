import type { NextConfig } from 'next'

const config: NextConfig = {
  // @place-map/shared is published as TypeScript source, not built output.
  transpilePackages: ['@place-map/shared'],

  // The dashboard shows images straight off the CDN. Next optimises them by
  // default, which on Vercel's free tier is a metered resource spent on
  // thumbnails only you will ever look at.
  images: { unoptimized: true },
}

export default config
