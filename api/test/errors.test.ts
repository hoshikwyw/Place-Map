import { describe, expect, it, vi } from 'vitest'
import { app } from '../src/app'
import worker from '../src/index'
import { badRequest, internal } from '../src/lib/errors'
import type { Env } from '../src/types'

const env = {
  DEFAULT_LANG: 'en',
  SUPPORTED_LANGS: 'en,uz',
  ADMIN_API_KEY: 'unused-here',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'unused-here',
  IMAGEKIT_URL_ENDPOINT: '',
} as Env

const ctx = { waitUntil() {}, passThroughOnException() {} } as unknown as ExecutionContext

// Routes that fail the way a real database call does. Registered on the real
// app, so the real error handler answers them. Vitest isolates each test file,
// so these never exist anywhere else.
const DB_DETAIL = 'value "100000000000000000000" is out of range for type bigint'
app.get('/__test/internal', () => {
  throw internal(DB_DETAIL)
})
app.get('/__test/bad-request', () => {
  throw badRequest('limit: Too big')
})

const get = (path: string) => worker.fetch(new Request(`https://api.test${path}`), env, ctx)

describe('error responses', () => {
  it('never sends a database message to the client', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})

    const res = await get('/__test/internal')
    const body = (await res.json()) as { error: { code: string; message: string } }

    expect(res.status).toBe(500)
    expect(body.error).toEqual({ code: 'internal', message: 'Something went wrong' })
    expect(JSON.stringify(body)).not.toContain('bigint')

    // ...but it is logged, so an operator can find out what happened.
    expect(log).toHaveBeenCalledWith('internal error', DB_DETAIL)
    log.mockRestore()
  })

  it('still sends messages written for the client', async () => {
    const res = await get('/__test/bad-request')
    const body = (await res.json()) as { error: { code: string; message: string } }

    expect(res.status).toBe(400)
    expect(body.error).toEqual({ code: 'bad_request', message: 'limit: Too big' })
  })
})
