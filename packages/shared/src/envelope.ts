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

/**
 * Narrowing a list of places, as query parameters.
 *
 * Both arrive comma-separated because they come from a URL a person can read,
 * share and bookmark: `?price=1,2&amenities=wifi,parking`.
 *
 * Only stable attributes are here. "Open now" and "nearest first" are not:
 * one depends on the clock and the other on where the reader is standing, and
 * a cached page cannot answer either. Clients apply those themselves.
 */
const PRICE_LEVEL_VALUES = [1, 2, 3]

/** "1,2" -> [1, 2]. A level outside the scale is a mistake worth reporting. */
const priceLevels = z.string().transform((value, ctx) => {
  const parts = value.split(',').map((part) => part.trim()).filter(Boolean)
  const levels: number[] = []

  for (const part of parts) {
    const level = Number(part)
    if (!PRICE_LEVEL_VALUES.includes(level)) {
      ctx.addIssue({ code: 'custom', message: 'price must be 1, 2 or 3' })
      return z.NEVER
    }
    levels.push(level)
  }

  return levels
})

/** "wifi,parking" -> ["wifi", "parking"]. Which exist is the catalog's business. */
const amenitySlugs = z.string().transform((value, ctx) => {
  const slugs = value.split(',').map((part) => part.trim()).filter(Boolean)

  if (slugs.length > 20 || slugs.some((slug) => slug.length > 40)) {
    ctx.addIssue({ code: 'custom', message: 'too many amenities' })
    return z.NEVER
  }

  return slugs
})

export const PlaceFiltersSchema = z.object({
  /** Price levels to include; a place with no level set matches none of them. */
  price: priceLevels.optional(),
  /** A place must have all of these, which is what a row of ticked boxes means. */
  amenities: amenitySlugs.optional(),
})

export type PlaceFilters = z.infer<typeof PlaceFiltersSchema>

export const SearchQuerySchema = PaginationSchema.extend({
  q: z.string().trim().min(2, 'q must be at least 2 characters').max(100),
  category: z.string().trim().min(1).max(80).optional(),
})

export type SearchQuery = z.infer<typeof SearchQuerySchema>
