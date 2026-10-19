// The Vercel function. Vercel picks functions out of api/ before the build
// runs, so this file has to be committed; the bundle it re-exports is made by
// `pnpm build:vercel` (see src/vercel.ts). Without it, every path is a 404.
export { default } from '../bundle/vercel.js'
