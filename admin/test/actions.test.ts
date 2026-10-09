import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Every server action re-checks the session.
 *
 * This is the test the dashboard most needed. A server action is a POST
 * endpoint with a generated URL - a signed-out stranger can call one directly,
 * and the `requireSession()` on the page that rendered the form guards
 * rendering, not the POST. Each action file says so in a comment; nothing
 * checked it.
 *
 * The list is built by *reading the modules*, not by naming the actions, so an
 * action added later is covered the day it is written. Forgetting the guard
 * fails this test; the only way to pass without one is to add the export to
 * PUBLIC below and say why.
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

vi.mock('next/cache', () => ({ revalidatePath: () => {} }))

/**
 * Actions anybody may call, named one by one with the reason.
 *
 * `signIn` is how a session begins, so requiring one would lock the dashboard
 * for good. It has its own protection - the password - and its own tests.
 * `signOut` only ends a session; demanding a valid one to throw it away would
 * mean an expired cookie could not be cleared.
 */
const PUBLIC = new Set(['signIn', 'signOut'])

const MODULES = {
  amenities: () => import('@/actions/amenities'),
  categories: () => import('@/actions/categories'),
  images: () => import('@/actions/images'),
  places: () => import('@/actions/places'),
  suggestions: () => import('@/actions/suggestions'),
  auth: () => import('@/actions/auth'),
}

/** Plausible arguments. The guard runs first, so none of these is reached. */
const ARGS: unknown[] = [1, 'a-slug', {}, new FormData()]

/** Every action is async, but their return types differ; this says so once. */
type Action = (...args: never[]) => Promise<unknown>

let fetched = 0

beforeEach(() => {
  jar.clear()
  fetched = 0
  vi.stubGlobal('fetch', async () => {
    fetched += 1
    return new Response(JSON.stringify({ data: {} }), {
      headers: { 'Content-Type': 'application/json' },
    })
  })
})

afterEach(() => vi.unstubAllGlobals())

async function everyAction() {
  const found: { file: string; name: string; fn: Action }[] = []

  for (const [file, load] of Object.entries(MODULES)) {
    const module = (await load()) as Record<string, unknown>
    for (const [name, value] of Object.entries(module)) {
      if (typeof value === 'function') {
        found.push({ file, name, fn: value as Action })
      }
    }
  }

  return found
}

describe('the guard on every action', () => {
  it('finds the actions to check in the first place', async () => {
    // Without this, a broken import would quietly make every test below pass
    // by having nothing to run against.
    const actions = await everyAction()
    expect(actions.length).toBeGreaterThanOrEqual(18)
  })

  it('sends a signed-out caller to the login page', async () => {
    const actions = await everyAction()
    const guarded = actions.filter((action) => !PUBLIC.has(action.name))

    for (const { file, name, fn } of guarded) {
      let error: unknown
      try {
        await fn(...(ARGS as never[]))
      } catch (caught) {
        error = caught
      }

      expect(error, `${file}.${name} did not redirect`).toBeInstanceOf(Redirected)
      expect((error as Redirected).to, `${file}.${name}`).toBe('/login')
    }
  })

  it('reaches neither the API nor ImageKit on the way out', async () => {
    // A guard that runs after the write would still redirect, and still have
    // done the thing.
    const actions = await everyAction()

    for (const { file, name, fn } of actions.filter((action) => !PUBLIC.has(action.name))) {
      fetched = 0
      await fn(...(ARGS as never[])).catch(() => {})
      expect(fetched, `${file}.${name} called out before checking the session`).toBe(0)
    }
  })

  it('leaves exactly two actions open, and they are the two expected', async () => {
    // Pins the allowlist itself: adding to it has to be a deliberate edit here.
    const actions = await everyAction()
    const open = actions.filter((action) => PUBLIC.has(action.name)).map((action) => action.name)
    expect(open.sort()).toEqual(['signIn', 'signOut'])
  })
})

describe('signing in', () => {
  it('refuses a wrong password without saying what was wrong', async () => {
    const { signIn } = await import('@/actions/auth')
    const form = new FormData()
    form.set('password', 'hunter2')

    const result = await signIn({}, form)
    expect(result.error).toBe('Wrong password')
    expect(jar.size).toBe(0)
  })

  it('refuses a missing password field', async () => {
    const { signIn } = await import('@/actions/auth')
    expect((await signIn({}, new FormData())).error).toBe('Wrong password')
  })

  it('starts a session and lands on the places list', async () => {
    const { signIn } = await import('@/actions/auth')
    const form = new FormData()
    form.set('password', 'correct-horse-battery-staple')

    await expect(signIn({}, form)).rejects.toMatchObject({ to: '/places' })
    expect(jar.has('place_map_session')).toBe(true)
  })
})

describe('signing out', () => {
  it('clears the session and lands on the login page', async () => {
    const { signOut } = await import('@/actions/auth')
    jar.set('place_map_session', 'whatever')

    await expect(signOut()).rejects.toMatchObject({ to: '/login' })
    expect(jar.has('place_map_session')).toBe(false)
  })

  it('works when there was no session to begin with', async () => {
    // An expired cookie still has to be clearable.
    const { signOut } = await import('@/actions/auth')
    await expect(signOut()).rejects.toMatchObject({ to: '/login' })
  })
})
