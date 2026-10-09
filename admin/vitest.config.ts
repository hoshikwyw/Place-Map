import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/**
 * The dashboard's tests run in plain Node, not in Next.
 *
 * Two things have to be arranged for that, and both are honest rather than
 * stubs of our own code:
 *
 * `import 'server-only'` is pointed at that package's own `empty.js` - the
 * exact file Next resolves it to in a server component, under the
 * `react-server` export condition. The default export throws on purpose, to
 * catch the import landing in a browser bundle; a test runner is neither, so
 * it needs saying which one it is. Aliased rather than set as a condition
 * because the package is external to Vite, so Node resolves it and never sees
 * the condition.
 *
 * `@/` is the same alias tsconfig gives the app, so a test imports a module by
 * the path the app uses.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'server-only': fileURLToPath(new URL('./node_modules/server-only/empty.js', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    setupFiles: ['test/setup.ts'],
  },
})
