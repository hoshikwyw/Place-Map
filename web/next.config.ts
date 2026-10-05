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

  // Images are already resized to 1200px WebP under 200 KB before they reach
  // the CDN (Part 3). Running them through Vercel's optimiser as well would
  // spend a metered free-tier quota to re-compress files that are already
  // small, so they are served straight from ImageKit.
  images: { unoptimized: true },

  // The chat assistant runs in the browser - it needs the visitor's location,
  // which only the browser has - so it calls the API directly. Exposed under
  // its own name so the one PLACE_MAP_API_URL setting serves both, and so
  // nothing else server-only leaks into the client bundle. Inlined at build.
  env: {
    PLACE_MAP_PUBLIC_API_URL: (process.env.PLACE_MAP_API_URL ?? '').replace(/\/+$/, ''),
  },
}

export default config
