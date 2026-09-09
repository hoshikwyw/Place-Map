/**
 * These scripts run on your machine, not in the Worker, so they read the root
 * `.env` via `node --env-file=../.env`. They use the service_role key and the
 * ImageKit private key - never run them anywhere you would not paste those.
 */
export function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    console.error(`Missing ${name}. Fill it into .env at the repo root.`)
    process.exit(1)
  }
  return value
}

export const env = {
  get supabaseUrl() {
    return required('SUPABASE_URL')
  },
  get supabaseKey() {
    return required('SUPABASE_SERVICE_ROLE_KEY')
  },
  get imagekitPrivateKey() {
    return required('IMAGEKIT_PRIVATE_KEY')
  },
}
