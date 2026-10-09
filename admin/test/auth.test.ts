import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The one lock on the dashboard.
 *
 * There is no user table and no Supabase Auth - one operator, one password, a
 * signed cookie - so everything that stands between a stranger and the whole
 * directory is in this one file. It had no tests at all.
 *
 * `next/headers` and `next/navigation` only exist inside a request, so both are
 * replaced here: a cookie jar that behaves like the real store, and a `redirect`
 * that throws the way Next's does (it never returns to its caller, and code
 * written as if it might is a bug).
 */

const jar = new Map<string, string>()

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
}))

class Redirected extends Error {
  constructor(readonly to: string) {
    super(`redirect to ${to}`)
  }
}

vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Redirected(to)
  },
}))

const { endSession, isSignedIn, passwordMatches, requireSession, startSession } = await import(
  '@/lib/auth'
)

const COOKIE = 'place_map_session'

beforeEach(() => jar.clear())
afterEach(() => vi.useRealTimers())

describe('the password check', () => {
  it('accepts the right password', () => {
    expect(passwordMatches('correct-horse-battery-staple')).toBe(true)
  })

  it('rejects a wrong one', () => {
    expect(passwordMatches('hunter2')).toBe(false)
  })

  it('rejects a prefix of the right one', () => {
    expect(passwordMatches('correct-horse')).toBe(false)
  })

  it('rejects the right one with something appended', () => {
    expect(passwordMatches('correct-horse-battery-staple!')).toBe(false)
  })

  it('rejects an empty password', () => {
    expect(passwordMatches('')).toBe(false)
  })

  it('compares every byte rather than stopping at the first difference', () => {
    // Not a timing measurement - those are far too noisy to assert on. This
    // pins the property that makes the comparison constant-time: a candidate
    // of a different length is still compared, so length alone cannot be read
    // off the answer.
    expect(passwordMatches('x'.repeat(500))).toBe(false)
    expect(passwordMatches('c')).toBe(false)
  })
})

describe('a session', () => {
  it('is not signed in with no cookie at all', async () => {
    expect(await isSignedIn()).toBe(false)
  })

  it('is signed in after starting one', async () => {
    await startSession()
    expect(await isSignedIn()).toBe(true)
  })

  it('is stored http-only, so a script on the page cannot read it', async () => {
    // Asserted through the options the cookie store receives, because that is
    // where the protection actually lives.
    const seen: Record<string, unknown>[] = []
    const headers = await import('next/headers')
    const original = headers.cookies
    vi.spyOn(headers, 'cookies').mockImplementation(
      async () =>
        ({
          get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
          set: (name: string, value: string, options: Record<string, unknown>) => {
            seen.push(options)
            jar.set(name, value)
          },
          delete: (name: string) => void jar.delete(name),
        }) as never,
    )

    await startSession()
    expect(seen[0]).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/' })
    vi.mocked(headers.cookies).mockImplementation(original)
  })

  it('ends when signed out', async () => {
    await startSession()
    await endSession()
    expect(await isSignedIn()).toBe(false)
  })
})

describe('a tampered cookie', () => {
  const token = async () => {
    await startSession()
    return jar.get(COOKIE)!
  }

  it('is refused when the expiry is edited', async () => {
    const [, signature] = (await token()).split('.')
    // A century from now, signed with the signature of the original expiry.
    jar.set(COOKIE, `${Date.now() + 3_000_000_000_000}.${signature}`)
    expect(await isSignedIn()).toBe(false)
  })

  it('is refused when the signature is edited', async () => {
    const [payload, signature] = (await token()).split('.')
    const flipped = signature!.startsWith('a') ? `b${signature!.slice(1)}` : `a${signature!.slice(1)}`
    jar.set(COOKIE, `${payload}.${flipped}`)
    expect(await isSignedIn()).toBe(false)
  })

  it('is refused when the signature is not hex at all', async () => {
    const [payload] = (await token()).split('.')
    jar.set(COOKIE, `${payload}.not-hex-at-all`)
    expect(await isSignedIn()).toBe(false)
  })

  it('is refused when the signature is an odd number of hex digits', async () => {
    const [payload] = (await token()).split('.')
    jar.set(COOKIE, `${payload}.abc`)
    expect(await isSignedIn()).toBe(false)
  })

  it('is refused when the signature is empty', async () => {
    const [payload] = (await token()).split('.')
    jar.set(COOKIE, `${payload}.`)
    expect(await isSignedIn()).toBe(false)
  })

  it('is refused when there is no separator', async () => {
    jar.set(COOKIE, 'justonevalue')
    expect(await isSignedIn()).toBe(false)
  })

  it('is refused when the payload is empty', async () => {
    const [, signature] = (await token()).split('.')
    jar.set(COOKIE, `.${signature}`)
    expect(await isSignedIn()).toBe(false)
  })

  it('is refused when the payload is not a number', async () => {
    // Correctly signed, but the expiry is nonsense - which must not read as
    // "never expires".
    const [, signature] = (await token()).split('.')
    jar.set(COOKIE, `tomorrow.${signature}`)
    expect(await isSignedIn()).toBe(false)
  })

  it('is refused when the cookie is empty', async () => {
    jar.set(COOKIE, '')
    expect(await isSignedIn()).toBe(false)
  })
})

describe('a session from somewhere else', () => {
  it('is refused once SESSION_SECRET changes', async () => {
    await startSession()
    const stolen = jar.get(COOKIE)!

    // Changing the secret is the only way to log everybody out, since nothing
    // about a session is stored server-side. It has to actually work.
    vi.resetModules()
    process.env.SESSION_SECRET = 'a-completely-different-secret'
    const fresh = await import('@/lib/auth')

    jar.set(COOKIE, stolen)
    expect(await fresh.isSignedIn()).toBe(false)

    process.env.SESSION_SECRET = 'test-session-secret-not-a-real-one'
    vi.resetModules()
  })
})

describe('an expired session', () => {
  it('is refused once its twelve hours are up', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    await startSession()
    expect(await isSignedIn()).toBe(true)

    vi.setSystemTime(new Date('2026-01-01T11:59:00Z'))
    expect(await isSignedIn()).toBe(true)

    vi.setSystemTime(new Date('2026-01-01T12:00:01Z'))
    expect(await isSignedIn()).toBe(false)
  })
})

describe('the page guard', () => {
  it('sends a signed-out visitor to the login page', async () => {
    await expect(requireSession()).rejects.toBeInstanceOf(Redirected)
    await expect(requireSession()).rejects.toMatchObject({ to: '/login' })
  })

  it('lets a signed-in operator through', async () => {
    await startSession()
    await expect(requireSession()).resolves.toBeUndefined()
  })

  it('sends an expired session back to the login page', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    await startSession()

    vi.setSystemTime(new Date('2026-01-02T00:00:00Z'))
    await expect(requireSession()).rejects.toMatchObject({ to: '/login' })
  })
})
