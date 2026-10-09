import { z } from 'zod'

/**
 * What a visitor says about a place.
 *
 * The second write anybody can make without a key, and the riskier of the two:
 * a suggestion is a private message to an editor, while a review is meant to
 * be published under somebody else's name. So nothing is published on arrival
 * - an editor approves it first - and a place's rating only moves when that
 * happens.
 *
 * There are no accounts, so there is no identity behind any of this. `author`
 * is a name somebody typed, worth exactly what a typed name is worth, and the
 * dashboard shows it as such.
 */

/** Whole stars only. Half stars invite precision the input cannot carry. */
export const REVIEW_RATING_MIN = 1
export const REVIEW_RATING_MAX = 5

/** Long enough to say why, short enough that an editor reads every one. */
export const REVIEW_COMMENT_MAX = 1000
export const REVIEW_AUTHOR_MAX = 80

export const CreateReviewSchema = z.object({
  place_id: z.number().int().positive(),
  rating: z.number().int().min(REVIEW_RATING_MIN).max(REVIEW_RATING_MAX),
  /** Optional: a star with no words is still a review. */
  comment: z.string().trim().max(REVIEW_COMMENT_MAX).nullish(),
  /** A name, not an identity. Blank means anonymous, which is the default. */
  author: z.string().trim().max(REVIEW_AUTHOR_MAX).nullish(),
  lang: z.string().trim().max(8).nullish(),
  /**
   * A field no person sees or fills, exactly as on suggestions. Anything in it
   * came from a script filling every input on the page, and the request is
   * answered as if it worked and dropped.
   */
  website: z.string().max(200).optional(),
})

export type CreateReview = z.infer<typeof CreateReviewSchema>

/**
 * All an editor decides: whether it is visible.
 *
 * The words themselves are never editable. A review is what somebody wrote,
 * and an editor who could rewrite it would be publishing their own opinion
 * under a visitor's name.
 */
export const UpdateReviewSchema = z.object({
  is_published: z.boolean(),
})

export type UpdateReview = z.infer<typeof UpdateReviewSchema>

/** A published review, as a reader sees it. */
export const ReviewSchema = z.object({
  id: z.number().int(),
  rating: z.number().int(),
  comment: z.string().nullable(),
  author: z.string().nullable(),
  created_at: z.string(),
})

export type Review = z.infer<typeof ReviewSchema>

/** The raw row, as the dashboard reads it. */
export interface ReviewRow {
  id: number
  place_id: number
  rating: number
  comment: string | null
  author: string | null
  is_published: boolean
  created_at: string
}

/**
 * How many of each star a place has, for the bar chart beside the average.
 * Built by a client from the reviews it already has, so it costs no request.
 */
export function ratingBreakdown(reviews: readonly { rating: number }[]): number[] {
  const counts: number[] = Array.from({ length: REVIEW_RATING_MAX }, () => 0)
  for (const review of reviews) {
    const index = review.rating - 1
    // A rating outside 1-5 cannot come from the schema, but this also runs on
    // whatever a cached response happens to hold.
    if (index >= 0 && index < counts.length) counts[index] = (counts[index] ?? 0) + 1
  }
  return counts
}
