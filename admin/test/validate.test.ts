import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { CreateCategorySchema, CreatePlaceSchema } from '@place-map/shared'
import { validate } from '@/lib/validate'

/**
 * The last check before anything leaves this server.
 *
 * The API would refuse the same input, so this is not about safety - it is
 * about the message. An API 400 arrives as one exception with one sentence;
 * parsing here turns a bad field into something naming the field, and saves a
 * round trip for a typo.
 */

describe('validate', () => {
  it('returns the parsed value when the input is good', () => {
    const result = validate(z.object({ slug: z.string() }), { slug: 'cafes' })
    expect(result.data).toEqual({ slug: 'cafes' })
    expect(result.error).toBeUndefined()
  })

  it('returns the schema’s own transformations, not the raw input', () => {
    const schema = z.object({ slug: z.string().trim().toLowerCase() })
    expect(validate(schema, { slug: '  CAFES  ' }).data).toEqual({ slug: 'cafes' })
  })

  it('names the field that was wrong', () => {
    const result = validate(z.object({ slug: z.string() }), { slug: 42 })
    expect(result.error).toMatch(/^slug: /)
    expect(result.data).toBeUndefined()
  })

  it('names a nested field by its full path', () => {
    const result = validate(z.object({ name: z.object({ en: z.string() }) }), { name: {} })
    expect(result.error).toMatch(/^name\.en: /)
  })

  it('reports one problem at a time, not a wall of them', () => {
    // The form shows a single line; six messages in it is not a better form.
    const schema = z.object({ a: z.string(), b: z.string(), c: z.string() })
    const result = validate(schema, {})
    expect(result.error?.split('\n')).toHaveLength(1)
  })

  it('still says something when the problem has no field', () => {
    const result = validate(z.string(), 42)
    expect(result.error).toBeTruthy()
    expect(result.error).not.toMatch(/^: /)
  })

  it('carries a refine message through', () => {
    const schema = z
      .object({ min: z.number(), max: z.number() })
      .refine((value) => value.min <= value.max, { message: 'Lowest cannot exceed highest', path: ['min'] })
    expect(validate(schema, { min: 9, max: 1 }).error).toBe('min: Lowest cannot exceed highest')
  })
})

describe('against the real write schemas', () => {
  it('accepts a category the form would build', () => {
    const result = validate(CreateCategorySchema, {
      slug: 'cafes',
      name: { en: 'Cafes', my: 'ကော်ဖီဆိုင်များ' },
      icon: '☕',
      icon_image: null,
      sort_order: 10,
      is_active: true,
    })
    expect(result.error).toBeUndefined()
  })

  it('refuses a category with no name in any language', () => {
    // `localized()` returns null when every box is blank, and that must not
    // reach the API as a nameless row.
    const result = validate(CreateCategorySchema, {
      slug: 'cafes',
      name: null,
      icon: null,
      icon_image: null,
      sort_order: 0,
      is_active: true,
    })
    expect(result.error).toMatch(/name/)
  })

  it('refuses a slug with spaces in it', () => {
    const result = validate(CreateCategorySchema, {
      slug: 'coffee shops',
      name: { en: 'Cafes' },
      icon: null,
      icon_image: null,
      sort_order: 0,
      is_active: true,
    })
    expect(result.error).toMatch(/^slug: /)
  })

  it('refuses a place with a price range the wrong way round', () => {
    const result = validate(CreatePlaceSchema, {
      category_id: 1,
      slug: 'cafe-central',
      name: { en: 'Cafe Central' },
      price_min: 9000,
      price_max: 1000,
    })
    expect(result.error).toBeTruthy()
  })
})
