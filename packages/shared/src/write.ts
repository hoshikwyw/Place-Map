import { z } from 'zod'
import { LocalizedTextSchema, OpeningHoursSchema } from './domain.js'

/**
 * Write payloads. The API validates against these and the admin dashboard
 * drives its forms from the same objects, so the two cannot drift: a field the
 * API would reject is a field the form will not submit.
 *
 * These describe the *database* shape (jsonb name, lat/lng columns), unlike the
 * read schemas which describe the flattened response.
 */

/** Lowercase, digits and single hyphens - it ends up in a public URL. */
export const SlugSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'lowercase letters, digits and single hyphens only')

const nullableString = (max: number) => z.string().trim().max(max).nullish()

// ----------------------------------------------------------------- categories

/**
 * Defaults live on the create schemas only.
 *
 * `.partial()` makes a field optional but does **not** remove its default, so
 * deriving an update schema from a create schema would turn `PATCH {}` into a
 * write that silently resets every defaulted column. Update schemas are built
 * from these bare fields instead.
 */
const CategoryFields = z.object({
  slug: SlugSchema,
  name: LocalizedTextSchema,
  icon: z.string().max(16).nullish(),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
})

export const CreateCategorySchema = CategoryFields.extend({
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
})

export type CreateCategory = z.infer<typeof CreateCategorySchema>

export const UpdateCategorySchema = CategoryFields.partial().refine(
  (value) => Object.keys(value).length > 0,
  'no fields to update',
)

export type UpdateCategory = z.infer<typeof UpdateCategorySchema>

// --------------------------------------------------------------------- places

const PlaceFields = z.object({
  category_id: z.number().int().positive(),
  slug: SlugSchema,
  name: LocalizedTextSchema,
  description: LocalizedTextSchema.nullish(),
  address: nullableString(300),
  lat: z.number().min(-90).max(90).nullish(),
  lng: z.number().min(-180).max(180).nullish(),
  phone: nullableString(40),
  website: z.string().trim().url().max(300).nullish(),
  opening_hours: OpeningHoursSchema.nullish(),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
})

/**
 * Half a coordinate is worse than none: the API would report a location the map
 * cannot place, and the bot would offer a Map button pointing at the equator.
 */
const bothOrNeitherCoordinate = (value: { lat?: number | null; lng?: number | null }) =>
  (value.lat === null || value.lat === undefined) === (value.lng === null || value.lng === undefined)

export const CreatePlaceSchema = PlaceFields.extend({
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
}).refine(bothOrNeitherCoordinate, 'lat and lng must be given together')

export type CreatePlace = z.infer<typeof CreatePlaceSchema>

export const UpdatePlaceSchema = PlaceFields.partial()
  .refine((value) => Object.keys(value).length > 0, 'no fields to update')
  .refine(bothOrNeitherCoordinate, 'lat and lng must be given together')

export type UpdatePlace = z.infer<typeof UpdatePlaceSchema>

// --------------------------------------------------------------------- images

/**
 * Registers an image that is *already* on the CDN. The API never receives file
 * bytes - resizing a photo costs far more than a Worker's 10 ms CPU budget, so
 * uploading is the CLI's job (Part 3) or the dashboard's server side (Part 5b),
 * and only the resulting path is recorded here.
 */
export const CreatePlaceImageSchema = z.object({
  storage_path: z.string().min(1).max(400),
  width: z.number().int().positive().nullish(),
  height: z.number().int().positive().nullish(),
  sort_order: z.number().int().default(0),
})

export type CreatePlaceImage = z.infer<typeof CreatePlaceImageSchema>

/** Whole-list reorder: the ids in the order they should appear. */
export const ReorderImagesSchema = z.object({
  image_ids: z.array(z.number().int().positive()).min(1).max(50),
})

export type ReorderImages = z.infer<typeof ReorderImagesSchema>
