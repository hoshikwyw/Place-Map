import { z } from 'zod'

/**
 * Domain schemas shared by the API, the admin dashboard, the web app and the
 * native app. The API validates its input against these; the dashboard drives
 * its forms from the same objects, so a schema change is a build error
 * everywhere instead of a runtime surprise in one client.
 */

// ------------------------------------------------------------------ language

/** `{"en": "Cafes", "uz": "Kafelar"}` - at least one locale required. */
export const LocalizedTextSchema = z
  .record(z.string().min(2).max(8), z.string().min(1))
  .refine((v) => Object.keys(v).length > 0, 'at least one locale is required')

export type LocalizedText = z.infer<typeof LocalizedTextSchema>

// ------------------------------------------------------------- opening hours

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const TimeRangeSchema = z
  .tuple([z.string().regex(TIME, 'expected HH:MM'), z.string().regex(TIME, 'expected HH:MM')])
  .refine(([open, close]) => open < close, 'opening time must be before closing time')

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
export type Weekday = (typeof WEEKDAYS)[number]

/**
 * `{"mon": [["09:00","18:00"]], "sun": []}`
 * Empty array means closed. Two ranges means a split shift.
 * A missing day is treated the same as closed.
 */
export const OpeningHoursSchema = z.object({
  mon: z.array(TimeRangeSchema),
  tue: z.array(TimeRangeSchema),
  wed: z.array(TimeRangeSchema),
  thu: z.array(TimeRangeSchema),
  fri: z.array(TimeRangeSchema),
  sat: z.array(TimeRangeSchema),
  sun: z.array(TimeRangeSchema),
}).partial()

export type OpeningHours = z.infer<typeof OpeningHoursSchema>

// ----------------------------------------------------------------- resources
// These describe what the API *returns*: name/description are already
// flattened to a single string for the requested language.

export const CategorySchema = z.object({
  id: z.number().int(),
  slug: z.string(),
  name: z.string(),
  icon: z.string().nullable(),
})

export type Category = z.infer<typeof CategorySchema>

export const PlaceImageSchema = z.object({
  url: z.string(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
})

export type PlaceImage = z.infer<typeof PlaceImageSchema>

export const LocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})

export type Location = z.infer<typeof LocationSchema>

export const PlaceSchema = z.object({
  id: z.number().int(),
  slug: z.string(),
  category: CategorySchema,
  name: z.string(),
  description: z.string().nullable(),
  address: z.string().nullable(),
  location: LocationSchema.nullable(),
  phone: z.string().nullable(),
  website: z.string().nullable(),
  opening_hours: OpeningHoursSchema.nullable(),
  images: z.array(PlaceImageSchema),
})

export type Place = z.infer<typeof PlaceSchema>

/** List rows carry the first image only - enough to render a card. */
export const PlaceSummarySchema = PlaceSchema.omit({ images: true }).extend({
  image: PlaceImageSchema.nullable(),
})

export type PlaceSummary = z.infer<typeof PlaceSummarySchema>
