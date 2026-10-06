import { z } from 'zod'

/**
 * Domain schemas shared by the API, the admin dashboard, the web app and the
 * native app. The API validates its input against these; the dashboard drives
 * its forms from the same objects, so a schema change is a build error
 * everywhere instead of a runtime surprise in one client.
 */

// ------------------------------------------------------------------ language

/** `{"en": "Cafes", "my": "ကော်ဖီဆိုင်များ"}` - at least one locale required. */
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
  /** An emoji. Always set it: the Telegram bot can only show this one. */
  icon: z.string().nullable(),
  /** An uploaded icon, as a full URL. Clients prefer it over the emoji. */
  icon_image: z.string().nullable(),
})

export type Category = z.infer<typeof CategorySchema>

export const PlaceImageSchema = z.object({
  url: z.string(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
})

export type PlaceImage = z.infer<typeof PlaceImageSchema>

/**
 * The places people actually look for a business: its Facebook page first, in
 * much of the world. "other" is the escape hatch, so an unusual link is still
 * storable without a schema change.
 */
export const LINK_TYPES = [
  'website',
  'facebook',
  'instagram',
  'tiktok',
  'youtube',
  'telegram',
  'viber',
  'whatsapp',
  'x',
  'other',
] as const

export type LinkType = (typeof LINK_TYPES)[number]

export const PlaceLinkSchema = z.object({
  type: z.enum(LINK_TYPES),
  /** Always absolute: a link that cannot be opened is worse than no link. */
  url: z.string().url().max(500),
  /** Shown instead of the platform's name. For "other", or a second account. */
  label: z.string().max(60).nullish(),
})

export type PlaceLink = z.infer<typeof PlaceLinkSchema>

export const LocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})

export type Location = z.infer<typeof LocationSchema>

/** 0-5, to one decimal place. */
export const RATING_MIN = 0
export const RATING_MAX = 5

/**
 * What a visit costs. Two halves, because places know different things about
 * their own prices: every place can say roughly how expensive it is, far fewer
 * will keep an exact range up to date, and a range that goes stale is worse
 * than none. Either half may be missing.
 */
export const PRICE_LEVELS = [1, 2, 3] as const

export type PriceLevel = (typeof PRICE_LEVELS)[number]

/**
 * One currency for the whole directory - it covers one city. Sent with the
 * price anyway so a client formats what it is given instead of assuming.
 */
export const PRICE_CURRENCY = 'MMK'

export const PriceSchema = z.object({
  /** 1 cheap, 2 moderate, 3 expensive. Null when only a range is known. */
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]).nullable(),
  /** Per person, in whole units of PRICE_CURRENCY. Null when not stated. */
  min: z.number().int().nonnegative().nullable(),
  max: z.number().int().nonnegative().nullable(),
  currency: z.literal(PRICE_CURRENCY),
})

export type Price = z.infer<typeof PriceSchema>

/**
 * The things people check before going somewhere. A closed list, not free
 * text: it has to be translatable, filterable later, and the same chip has to
 * mean the same thing on every place.
 */
export const AMENITIES = [
  'wifi',
  'parking',
  'outdoor_seating',
  'air_conditioning',
  'delivery',
  'takeaway',
  'card_payment',
  'family_friendly',
  'wheelchair_accessible',
] as const

export type Amenity = (typeof AMENITIES)[number]

export const AmenitySchema = z.enum(AMENITIES)

export const PlaceSchema = z.object({
  id: z.number().int(),
  slug: z.string(),
  category: CategorySchema,
  name: z.string(),
  description: z.string().nullable(),
  address: z.string().nullable(),
  location: LocationSchema.nullable(),
  phone: z.string().nullable(),
  /** The canonical site. The bot shows this one. */
  website: z.string().nullable(),
  /** Social profiles and anything else, in display order. */
  links: z.array(PlaceLinkSchema),
  opening_hours: OpeningHoursSchema.nullable(),
  /** Null when neither a level nor a range is known. */
  price: PriceSchema.nullable(),
  /** Known amenities only, in the order AMENITIES lists them. */
  amenities: z.array(AmenitySchema),
  /** Average of published reviews, 0-5. Null when nobody has rated it. */
  rating: z.number().min(RATING_MIN).max(RATING_MAX).nullable(),
  /** How many ratings that average is built from. */
  rating_count: z.number().int().nonnegative(),
  images: z.array(PlaceImageSchema),
})

export type Place = z.infer<typeof PlaceSchema>

/** List rows carry the first image only - enough to render a card. */
export const PlaceSummarySchema = PlaceSchema.omit({ images: true }).extend({
  image: PlaceImageSchema.nullable(),
})

export type PlaceSummary = z.infer<typeof PlaceSummarySchema>
