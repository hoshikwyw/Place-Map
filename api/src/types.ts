export interface Env {
  // Secrets - `wrangler secret put NAME`, or .dev.vars locally
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  IMAGEKIT_URL_ENDPOINT: string
  TELEGRAM_BOT_TOKEN: string
  TELEGRAM_WEBHOOK_SECRET: string
  ADMIN_API_KEY: string

  // Plain vars from wrangler.toml
  DEFAULT_LANG: string
  SUPPORTED_LANGS: string

  // Optional bindings
  CACHE?: KVNamespace
}

/** Hono context typing: `c.get('lang')` is set once by middleware per request. */
export type AppBindings = {
  Bindings: Env
  Variables: {
    lang: string
  }
}
