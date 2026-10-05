import type { NextConfig } from 'next'

const config: NextConfig = {
  /*
   * `next build` and `next dev` share .next by default, so building while the
   * dev server is running leaves it serving half-overwritten chunks ("Cannot
   * find module './vendor-chunks/...'"). Set NEXT_DIST_DIR to build somewhere
   * else: `NEXT_DIST_DIR=.next-build pnpm --filter @place-map/web build`.
   */
  distDir: process.env.NEXT_DIST_DIR || '.next',

  // @place-map/shared is published as TypeScript source, not built output.
  transpilePackages: ['@place-map/shared'],

  // The dashboard shows images straight off the CDN. Next optimises them by
  // default, which on Vercel's free tier is a metered resource spent on
  // thumbnails only you will ever look at.
  images: { unoptimized: true },
}

export default config
