import 'server-only'

/**
 * Every value here is a server secret. The `server-only` import above turns any
 * accidental import from a client component into a build error rather than a
 * key shipped to the browser.
 */
function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing environment variable ${name}`)
  return value
}

export const env = {
  get apiUrl() {
    return required('PLACE_MAP_API_URL').replace(/\/+$/, '')
  },
  get apiKey() {
    return required('ADMIN_API_KEY')
  },
  get password() {
    return required('ADMIN_PASSWORD')
  },
  get sessionSecret() {
    return required('SESSION_SECRET')
  },
  get imagekitEndpoint() {
    return required('IMAGEKIT_URL_ENDPOINT').replace(/\/+$/, '')
  },
  get imagekitPrivateKey() {
    return required('IMAGEKIT_PRIVATE_KEY')
  },
}
