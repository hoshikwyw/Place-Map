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
  /**
   * Photo upload is optional: the dashboard is fully usable for text, hours and
   * categories before an ImageKit account exists. Null unless both values are
   * set, so callers switch the feature off instead of crashing a page on a
   * missing variable.
   */
  get imagekit(): { endpoint: string; privateKey: string } | null {
    const endpoint = process.env.IMAGEKIT_URL_ENDPOINT?.trim()
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY?.trim()
    return endpoint && privateKey ? { endpoint: endpoint.replace(/\/+$/, ''), privateKey } : null
  },
}
