import { describe, expect, it, vi } from 'vitest'
import { app } from '../src/app'
import worker from '../src/index'
import { badRequest, fromPostgres, internal } from '../src/lib/errors'
import type { Env } from '../src/types'

const env = {
  DEFAULT_LANG: 'en',
  SUPPORTED_LANGS: 'en,my',
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

/**
 * Postgres codes become messages an operator can act on. Untested until now,
 * which is how a refactor quietly turned the one about a category that still
 * holds places into "That category does not exist".
 */
describe('fromPostgres', () => {
  const pg = (code: string) => ({ code, message: 'raw postgres text' })

  it('names the real problem when a delete is refused by a reference', () => {
    // The context carries what was being deleted, so this must not depend on
    // the word being exactly "delete".
    for (const context of ['delete', 'delete category', 'delete amenity']) {
      expect(fromPostgres(pg('23503'), context).message).toBe(
        'Still referenced by other rows - move or delete those first',
      )
    }
  })

  it('reads the same code differently when something is being created', () => {
    // Creating with a category_id that does not exist is the other way to hit
    // a foreign key, and the advice is the opposite.
    expect(fromPostgres(pg('23503'), 'create place').message).toBe('That category does not exist')
  })

  it('turns a duplicate slug into advice rather than a 500', () => {
    const error = fromPostgres(pg('23505'), 'create place')
    expect(error.status).toBe(400)
    expect(error.message).toBe('That slug is already taken')
  })

  it('maps the other expected codes to 400', () => {
    expect(fromPostgres(pg('23502'), 'create place').status).toBe(400)
    expect(fromPostgres(pg('22P02'), 'update place').status).toBe(400)
  })

  it('never passes the database its own words for anything unexpected', () => {
    // Raw Postgres text names columns, types and values.
    const error = fromPostgres(pg('XX000'), 'update place')
    expect(error.status).toBe(500)
    expect(error.message).not.toContain('raw postgres text')
  })
})
