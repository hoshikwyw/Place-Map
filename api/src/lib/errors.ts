import type { ErrorCode } from '@place-map/shared'

export class ApiError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly status: 400 | 404 | 429 | 500,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const notFound = (message = 'Not found') => new ApiError('not_found', message, 404)
export const badRequest = (message: string) => new ApiError('bad_request', message, 400)
export const rateLimited = (message = 'Too many requests') =>
  new ApiError('rate_limited', message, 429)
export const internal = (message = 'Something went wrong') =>
  new ApiError('internal', message, 500)

export interface PgError {
  code?: string
  message: string
  details?: string | null
}

/**
 * Turns a Postgres constraint failure into an error the dashboard can show a
 * human, instead of a 500 with a schema dump in it.
 */
export function fromPostgres(error: PgError, context: string): ApiError {
  switch (error.code) {
    case '23505':
      return badRequest('That slug is already taken')
    case '23503':
      // Either the referenced row is missing, or something still points here.
      return badRequest(
        context.startsWith('delete')
          ? 'Still referenced by other rows - move or delete those first'
          : 'That category does not exist',
      )
    case '23502':
      return badRequest('A required field was missing')
    case '22P02':
      return badRequest('A field had the wrong type')
    default:
      console.error(`db error during ${context}`, error)
      return internal()
  }
}
