import { z } from 'zod'

/**
 * Every response the API produces has one of three shapes. Clients switch on
 * `error.code`, never on `error.message` - messages are for humans and will
 * change.
 */

export const ERROR_CODES = ['not_found', 'bad_request', 'rate_limited', 'internal'] as const
export type ErrorCode = (typeof ERROR_CODES)[number]

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.enum(ERROR_CODES),
    message: z.string(),
  }),
})

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>

export const MetaSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  has_more: z.boolean(),
})

export type Meta = z.infer<typeof MetaSchema>

export type ItemResponse<T> = { data: T }
export type ListResponse<T> = { data: T[]; meta: Meta }

export const itemResponseSchema = <T extends z.ZodType>(item: T) => z.object({ data: item })
export const listResponseSchema = <T extends z.ZodType>(item: T) =>
  z.object({ data: z.array(item), meta: MetaSchema })

// ------------------------------------------------------------ query defaults

export const PAGE_DEFAULT = 1
export const LIMIT_DEFAULT = 20
export const LIMIT_MAX = 50

/** Coerces `?page=` / `?limit=` and clamps them so a client cannot ask for 10k rows. */
export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(PAGE_DEFAULT),
  limit: z.coerce.number().int().positive().max(LIMIT_MAX).default(LIMIT_DEFAULT),
})

export type Pagination = z.infer<typeof PaginationSchema>

export const SearchQuerySchema = PaginationSchema.extend({
  q: z.string().trim().min(2, 'q must be at least 2 characters').max(100),
  category: z.string().trim().min(1).max(80).optional(),
})

export type SearchQuery = z.infer<typeof SearchQuerySchema>
