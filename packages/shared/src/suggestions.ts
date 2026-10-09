import { z } from 'zod'

/**
 * What a visitor can tell the directory: a place that is missing, or something
 * wrong with one that is listed.
 *
 * This is the only write anybody can make without a key, so the shape is
 * deliberately small and every field is bounded. Nothing sent here is ever
 * shown to another visitor - an editor reads it and acts, or does not.
 */

export const SUGGESTION_KINDS = ['new_place', 'correction'] as const
export type SuggestionKind = (typeof SUGGESTION_KINDS)[number]

export const SUGGESTION_STATUSES = ['new', 'done', 'ignored'] as const
export type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number]

/** Long enough for an address and a sentence about it; short enough to read. */
export const SUGGESTION_NOTE_MAX = 1000

export const CreateSuggestionSchema = z
  .object({
    kind: z.enum(SUGGESTION_KINDS),
    /** The place a correction is about. Ignored for a new place. */
    place_id: z.number().int().positive().nullish(),
    /** The name of the place being suggested. */
    name: z.string().trim().max(120).nullish(),
    note: z.string().trim().min(5, 'Tell us a little more').max(SUGGESTION_NOTE_MAX),
    /** Optional, and only so an editor can ask a question back. */
    contact: z.string().trim().max(120).nullish(),
    lang: z.string().trim().max(8).nullish(),
    /**
     * A field no person sees or fills. Anything in it came from a bot filling
     * every input on the page, and the request is dropped - cheaper and
     * quieter than a captcha, which would also be one more thing to pay for.
     */
    website: z.string().max(200).optional(),
  })
  .refine((value) => value.kind !== 'new_place' || Boolean(value.name), {
    message: 'A name is needed for a new place',
    path: ['name'],
  })

export type CreateSuggestion = z.infer<typeof CreateSuggestionSchema>

/** All an editor can change: whether it still needs attention. */
export const UpdateSuggestionSchema = z.object({
  status: z.enum(SUGGESTION_STATUSES),
})

export type UpdateSuggestion = z.infer<typeof UpdateSuggestionSchema>

/** What the dashboard reads back. */
export interface SuggestionRow {
  id: number
  kind: SuggestionKind
  place_id: number | null
  name: string | null
  note: string
  contact: string | null
  status: SuggestionStatus
  lang: string | null
  created_at: string
}
