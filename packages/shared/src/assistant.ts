import { z } from 'zod'
import { CategorySchema, PlaceSummarySchema } from './domain'

/**
 * The place-finding assistant: a typed request such as "cafe near me" or
 * "အနီးက ကော်ဖီဆိုင်", answered with matching places. Keyword matching only -
 * no AI - so it is free, instant and predictable.
 *
 * The client sends its location only when the assistant asks for it
 * (`needs_location`), so someone asking for "museums" is never prompted.
 */

export const ASSISTANT_LIMIT_DEFAULT = 10
export const ASSISTANT_LIMIT_MAX = 20

/** Radius used for "near me" when the message does not name one. */
export const ASSISTANT_RADIUS_KM_DEFAULT = 5
export const ASSISTANT_RADIUS_KM_MAX = 50

export const AssistantQuerySchema = z
  .object({
    q: z.string().trim().min(1, 'q is required').max(200),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    limit: z.coerce.number().int().positive().max(ASSISTANT_LIMIT_MAX).default(ASSISTANT_LIMIT_DEFAULT),
  })
  .refine((v) => (v.lat === undefined) === (v.lng === undefined), {
    message: 'lat and lng must be given together',
    path: ['lat'],
  })

export type AssistantQuery = z.infer<typeof AssistantQuerySchema>

/** A place plus how far it is from the person asking, when they shared a location. */
export const NearbyPlaceSchema = PlaceSummarySchema.extend({
  distance_m: z.number().int().nonnegative().nullable(),
})

export type NearbyPlace = z.infer<typeof NearbyPlaceSchema>

export const AssistantResultSchema = z.object({
  /** One sentence in the requested language, ready to show as the assistant's message. */
  reply: z.string(),
  /** The request was "near me" but came without lat/lng. Ask for location and send it again. */
  needs_location: z.boolean(),
  /** What the message was read as - lets a client show it, and makes mistakes visible. */
  understood: z.object({
    category: CategorySchema.nullable(),
    near_me: z.boolean(),
    radius_km: z.number().nullable(),
    open_now: z.boolean(),
    keywords: z.array(z.string()),
  }),
  places: z.array(NearbyPlaceSchema),
})

export type AssistantResult = z.infer<typeof AssistantResultSchema>
