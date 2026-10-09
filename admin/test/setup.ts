/**
 * The environment the dashboard reads at module load.
 *
 * Every value here is fake, and deliberately looks it. `env.ts` throws when one
 * is missing, so without this the first import of almost any module fails -
 * which is itself the behaviour a missing variable should have in production.
 */
process.env.PLACE_MAP_API_URL ??= 'https://api.test'
process.env.ADMIN_API_KEY ??= 'test-api-key'
process.env.ADMIN_PASSWORD ??= 'correct-horse-battery-staple'
process.env.SESSION_SECRET ??= 'test-session-secret-not-a-real-one'
process.env.LOCALES ??= 'en,my'

// ImageKit is deliberately left unset: it is optional, and the dashboard has to
// work without it. The tests that need it set it themselves.
