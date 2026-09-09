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
