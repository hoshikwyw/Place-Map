import { toJSONSchema, type z } from 'zod'
import {
  CategorySchema,
  CreateCategorySchema,
  CreatePlaceImageSchema,
  CreatePlaceSchema,
  ErrorResponseSchema,
  LIMIT_DEFAULT,
  LIMIT_MAX,
  MetaSchema,
  PlaceImageSchema,
  PlaceSchema,
  PlaceSummarySchema,
  ReorderImagesSchema,
  UpdateCategorySchema,
  UpdatePlaceSchema,
} from '@place-map/shared'
import type { Env } from './types.js'

/**
 * The OpenAPI 3.1 description of this API, served at /openapi.json and browsed
 * at /docs.
 *
 * Request and response schemas are generated from the same Zod objects the API
 * validates with (packages/shared), so the documentation cannot drift from the
 * behaviour. test/docs.test.ts also fails if a route is mounted without being
 * described here.
 */

type Json = Record<string, unknown>

/**
 * `input` for request bodies - a field with a default is optional to send.
 * `output` for responses - it is always present in what comes back.
 * Refinements (e.g. "lat and lng together") cannot be expressed in JSON Schema;
 * they are left out of the schema and written into the descriptions instead.
 */
function schema(source: z.ZodType, io: 'input' | 'output'): Json {
  const { $schema: _dialect, ...rest } = toJSONSchema(source, { io, unrepresentable: 'any' }) as Json
  return withoutSafeIntegerBounds(rest)
}

/**
 * Zod writes JavaScript's safe-integer limits onto every `.int()` as a minimum
 * and maximum. They are not real constraints, and Swagger UI picks the minimum
 * as the example value - so every id in the docs read -9007199254740991.
 */
function withoutSafeIntegerBounds<T>(node: T): T {
  if (Array.isArray(node)) return node.map(withoutSafeIntegerBounds) as T
  if (!node || typeof node !== 'object') return node

  const out: Json = {}
  for (const [key, value] of Object.entries(node)) {
    if (key === 'minimum' && value === Number.MIN_SAFE_INTEGER) continue
    if (key === 'maximum' && value === Number.MAX_SAFE_INTEGER) continue
    out[key] = withoutSafeIntegerBounds(value)
  }
  return out as T
}

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` })

const itemOf = (data: Json) => ({ type: 'object', required: ['data'], properties: { data } })

const listOf = (items: Json) => ({
  type: 'object',
  required: ['data', 'meta'],
  properties: { data: { type: 'array', items }, meta: ref('Meta') },
})

const json = (description: string, body: Json) => ({ description, content: { 'application/json': { schema: body } } })

const ERROR_TEXT: Record<string, string> = {
  '400': 'Invalid input. `error.message` says which field and why.',
  '401': 'Missing or wrong `X-API-Key`.',
  '404': 'No such resource.',
  '500': 'Something failed on the server. The detail is logged, never returned.',
}

const errors = (...statuses: string[]) =>
  Object.fromEntries(statuses.map((status) => [status, json(ERROR_TEXT[status]!, ref('Error'))]))

function requestBody(name: string, example: Json, description?: string) {
  return {
    required: true,
    description,
    content: { 'application/json': { schema: ref(name), example } },
  }
}

// ---------------------------------------------------------------- raw rows
// The admin API returns database rows as stored: every translation, and
// inactive rows too. These have no Zod schema of their own.

const localized = { type: 'object', additionalProperties: { type: 'string' }, example: { en: 'Cafes', uz: 'Kafelar' } }
const nullable = (type: string) => ({ type: [type, 'null'] })

const CategoryRow = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    slug: { type: 'string' },
    name: localized,
    icon: nullable('string'),
    sort_order: { type: 'integer' },
    is_active: { type: 'boolean' },
    created_at: { type: 'string', format: 'date-time' },
  },
}

const PlaceRow = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    category_id: { type: 'integer' },
    slug: { type: 'string' },
    name: localized,
    description: { anyOf: [localized, { type: 'null' }] },
    address: nullable('string'),
    lat: nullable('number'),
    lng: nullable('number'),
    phone: nullable('string'),
    website: nullable('string'),
    opening_hours: { type: ['object', 'null'], description: '`{"mon": [["09:00","18:00"]], "sun": []}`' },
    is_active: { type: 'boolean' },
    sort_order: { type: 'integer' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
    search_text: { type: 'string', description: 'Generated: every locale plus the address, for search.' },
  },
}

const ImageRow = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    place_id: { type: 'integer' },
    storage_path: { type: 'string' },
    telegram_file_id: nullable('string'),
    width: nullable('integer'),
    height: nullable('integer'),
    sort_order: { type: 'integer' },
  },
}

// -------------------------------------------------------------- parameters

function parameters(languages: string[]) {
  return {
    Lang: {
      name: 'lang',
      in: 'query',
      required: false,
      description:
        'Language for `name` and `description`. Wins over `Accept-Language`. ' +
        'An unsupported value falls back to the default rather than failing.',
      schema: { type: 'string', enum: languages },
    },
    Page: {
      name: 'page',
      in: 'query',
      required: false,
      schema: { type: 'integer', minimum: 1, default: 1 },
    },
    Limit: {
      name: 'limit',
      in: 'query',
      required: false,
      description: `Rows per page. More than ${LIMIT_MAX} is a 400, not a silent clamp.`,
      schema: { type: 'integer', minimum: 1, maximum: LIMIT_MAX, default: LIMIT_DEFAULT },
    },
    IdOrSlug: {
      name: 'idOrSlug',
      in: 'path',
      required: true,
      description: 'Numeric id (`1`) or slug (`cafe-central`).',
      schema: { type: 'string' },
      example: 'cafe-central',
    },
    /**
     * Same template name as IdOrSlug on purpose: OpenAPI treats
     * /places/{idOrSlug} and /places/{id} as the same path and forbids
     * declaring both, so reads and writes share the path and each operation
     * says what it accepts.
     */
    PlaceId: {
      name: 'idOrSlug',
      in: 'path',
      required: true,
      description: 'Numeric place id. Writes do not accept a slug.',
      schema: { type: 'integer', minimum: 1 },
      example: 1,
    },
    CategorySlug: { name: 'slug', in: 'path', required: true, schema: { type: 'string' }, example: 'cafes' },
    Id: { name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 }, example: 1 },
    ImageId: { name: 'imageId', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } },
  }
}

const p = (name: string) => ({ $ref: `#/components/parameters/${name}` })

// ------------------------------------------------------------------- paths

const ADMIN = [{ ApiKey: [] }]

const paths = {
  '/v1/health': {
    get: {
      tags: ['Health'],
      operationId: 'health',
      summary: 'Worker and database status',
      description: 'Returns 503 when the Worker cannot reach Postgres - the right thing to point an uptime monitor at.',
      responses: {
        '200': json('Healthy.', ref('Health')),
        '503': json('The database is unreachable.', ref('Health')),
      },
    },
  },

  '/v1/categories': {
    get: {
      tags: ['Categories'],
      operationId: 'listCategories',
      summary: 'Active categories, in display order',
      parameters: [p('Lang')],
      responses: { '200': json('Categories.', listOf(ref('Category'))) },
    },
    post: {
      tags: ['Admin: categories'],
      operationId: 'createCategory',
      summary: 'Create a category',
      security: ADMIN,
      requestBody: requestBody('CreateCategory', {
        slug: 'bakeries',
        name: { en: 'Bakeries', uz: 'Novvoyxonalar' },
        icon: '🥐',
        sort_order: 60,
      }),
      responses: { '201': json('Created. Returns the raw row.', itemOf(ref('CategoryRow'))), ...errors('400', '401') },
    },
  },

  '/v1/categories/{slug}/places': {
    get: {
      tags: ['Categories'],
      operationId: 'listCategoryPlaces',
      summary: "A category's places, paginated",
      parameters: [p('CategorySlug'), p('Page'), p('Limit'), p('Lang')],
      responses: {
        '200': json('One page of places.', listOf(ref('PlaceSummary'))),
        ...errors('400', '404'),
      },
    },
  },

  '/v1/categories/{id}': {
    patch: {
      tags: ['Admin: categories'],
      operationId: 'updateCategory',
      summary: 'Update a category',
      description: 'Send only the fields to change. An empty body is a 400.',
      security: ADMIN,
      parameters: [p('Id')],
      requestBody: requestBody('UpdateCategory', { icon: '☕', sort_order: 5 }),
      responses: { '200': json('Updated row.', itemOf(ref('CategoryRow'))), ...errors('400', '401', '404') },
    },
    delete: {
      tags: ['Admin: categories'],
      operationId: 'deleteCategory',
      summary: 'Delete a category',
      description: 'Refused with a 400 while the category still holds places.',
      security: ADMIN,
      parameters: [p('Id')],
      responses: { '200': json('The deleted row.', itemOf(ref('CategoryRow'))), ...errors('400', '401', '404') },
    },
  },

  '/v1/places/{idOrSlug}': {
    get: {
      tags: ['Places'],
      operationId: 'getPlace',
      summary: 'One place, with all its images',
      parameters: [p('IdOrSlug'), p('Lang')],
      responses: { '200': json('The place.', itemOf(ref('Place'))), ...errors('404') },
    },
    patch: {
      tags: ['Admin: places'],
      operationId: 'updatePlace',
      summary: 'Update a place',
      description: 'Send only the fields to change. An empty body is a 400.',
      security: ADMIN,
      parameters: [p('PlaceId')],
      requestBody: requestBody('UpdatePlace', { phone: '+998901234567' }),
      responses: { '200': json('Updated row.', itemOf(ref('PlaceRow'))), ...errors('400', '401', '404') },
    },
    delete: {
      tags: ['Admin: places'],
      operationId: 'deletePlace',
      summary: 'Delete a place',
      description: 'Its image rows go too. The image files stay on the CDN.',
      security: ADMIN,
      parameters: [p('PlaceId')],
      responses: { '200': json('The deleted row.', itemOf(ref('PlaceRow'))), ...errors('400', '401', '404') },
    },
  },

  '/v1/places/{idOrSlug}/images': {
    get: {
      tags: ['Places'],
      operationId: 'listPlaceImages',
      summary: "A place's images, in display order",
      parameters: [p('IdOrSlug')],
      responses: { '200': json('Images.', listOf(ref('PlaceImage'))), ...errors('404') },
    },
    post: {
      tags: ['Admin: images'],
      operationId: 'addPlaceImage',
      summary: 'Record an image already uploaded to the CDN',
      description: 'The API never receives file bytes - upload to ImageKit first, then record the path here.',
      security: ADMIN,
      parameters: [p('PlaceId')],
      requestBody: requestBody('CreatePlaceImage', {
        storage_path: '/places/cafe-central/cafe-central-1.webp',
        width: 1200,
        height: 800,
      }),
      responses: { '201': json('Created.', itemOf(ref('ImageRow'))), ...errors('400', '401', '404') },
    },
  },

  '/v1/search': {
    get: {
      tags: ['Search'],
      operationId: 'search',
      summary: 'Search places across every language',
      description: '"kafe" finds the Uzbek name and "coffee" the English description, without choosing a language.',
      parameters: [
        { name: 'q', in: 'query', required: true, schema: { type: 'string', minLength: 2, maxLength: 100 }, example: 'kafe' },
        { name: 'category', in: 'query', required: false, description: 'Category slug to search within.', schema: { type: 'string' } },
        p('Page'),
        p('Limit'),
        p('Lang'),
      ],
      responses: { '200': json('Matching places.', listOf(ref('PlaceSummary'))), ...errors('400', '404') },
    },
  },

  '/v1/places': {
    get: {
      tags: ['Places'],
      operationId: 'listPlaces',
      summary: 'Every active place, paginated',
      description: 'The unfiltered browse list, across all categories. Places in hidden categories are left out.',
      parameters: [p('Page'), p('Limit'), p('Lang')],
      responses: { '200': json('One page of places.', listOf(ref('PlaceSummary'))), ...errors('400') },
    },
    post: {
      tags: ['Admin: places'],
      operationId: 'createPlace',
      summary: 'Create a place',
      description: '`lat` and `lng` must be given together. A duplicate slug is a 400.',
      security: ADMIN,
      requestBody: requestBody('CreatePlace', {
        category_id: 1,
        slug: 'green-tea-house',
        name: { en: 'Green Tea House', uz: 'Yashil choy uyi' },
        description: { en: 'Quiet tea room with a garden.', uz: 'Bog‘li sokin choyxona.' },
        address: '7 Navoi St',
        lat: 41.3123,
        lng: 69.2787,
        phone: '+998901112244',
        website: 'https://example.com',
        opening_hours: {
          mon: [['09:00', '21:00']],
          tue: [['09:00', '21:00']],
          wed: [['09:00', '21:00']],
          thu: [['09:00', '21:00']],
          fri: [['09:00', '22:00']],
          sat: [['10:00', '14:00'], ['16:00', '22:00']],
          sun: [],
        },
        sort_order: 10,
      }),
      responses: { '201': json('Created. Returns the raw row.', itemOf(ref('PlaceRow'))), ...errors('400', '401') },
    },
  },

  '/v1/places/{id}/images/reorder': {
    patch: {
      tags: ['Admin: images'],
      operationId: 'reorderPlaceImages',
      summary: "Set a place's image order",
      description: 'List exactly the image ids the place owns, first to last. A partial or foreign list is a 400.',
      security: ADMIN,
      parameters: [p('Id')],
      requestBody: requestBody('ReorderImages', { image_ids: [3, 1, 2] }),
      responses: {
        '200': json('The new order.', itemOf({ type: 'object', properties: { image_ids: { type: 'array', items: { type: 'integer' } } } })),
        ...errors('400', '401', '404'),
      },
    },
  },

  '/v1/images/{imageId}': {
    delete: {
      tags: ['Admin: images'],
      operationId: 'deleteImage',
      summary: 'Remove an image record',
      description: 'The file stays on the CDN, so a mistake is recoverable.',
      security: ADMIN,
      parameters: [p('ImageId')],
      responses: { '200': json('Removed.', itemOf({ type: 'object', properties: { id: { type: 'integer' }, place_id: { type: 'integer' } } })), ...errors('401', '404') },
    },
  },

  '/v1/admin/categories': {
    get: {
      tags: ['Admin: reads'],
      operationId: 'adminListCategories',
      summary: 'Every category, raw, including inactive ones',
      security: ADMIN,
      responses: { '200': json('Raw rows.', { type: 'object', properties: { data: { type: 'array', items: ref('CategoryRow') } } }), ...errors('401') },
    },
  },

  '/v1/admin/places': {
    get: {
      tags: ['Admin: reads'],
      operationId: 'adminListPlaces',
      summary: 'Every place, raw, including inactive ones',
      security: ADMIN,
      parameters: [
        { name: 'category_id', in: 'query', required: false, schema: { type: 'integer' } },
        { name: 'q', in: 'query', required: false, description: 'Search across every language.', schema: { type: 'string' } },
        p('Page'),
        { name: 'limit', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 } },
      ],
      responses: { '200': json('Raw rows.', listOf(ref('PlaceRow'))), ...errors('401') },
    },
  },

  '/v1/admin/places/{id}': {
    get: {
      tags: ['Admin: reads'],
      operationId: 'adminGetPlace',
      summary: 'One place, raw',
      security: ADMIN,
      parameters: [p('Id')],
      responses: { '200': json('Raw row.', itemOf(ref('PlaceRow'))), ...errors('400', '401', '404') },
    },
  },

  '/v1/admin/places/{id}/images': {
    get: {
      tags: ['Admin: reads'],
      operationId: 'adminListPlaceImages',
      summary: "A place's image rows, raw",
      security: ADMIN,
      parameters: [p('Id')],
      responses: { '200': json('Raw rows.', { type: 'object', properties: { data: { type: 'array', items: ref('ImageRow') } } }), ...errors('400', '401') },
    },
  },
}

// -------------------------------------------------------------------- spec

let cached: { languages: string; spec: Json } | undefined

/**
 * Built once per Worker isolate and reused: schema generation is cheap, but not
 * free, and the Worker has 10 ms of CPU per request.
 */
export function openApiSpec(env: Env): Json {
  if (cached && cached.languages === env.SUPPORTED_LANGS) return cached.spec

  const languages = env.SUPPORTED_LANGS.split(',').map((s) => s.trim()).filter(Boolean)

  const spec = {
    openapi: '3.1.0',
    info: {
      title: 'Place Map API',
      version: '1.0.0',
      description: [
        'Public reads need nothing. Admin endpoints need the `X-API-Key` header - press **Authorize** and paste it once.',
        '',
        '**Admin requests change the real database.** There is no sandbox.',
        '',
        'Every list response is `{ data, meta }`, every single item `{ data }`, every error `{ error: { code, message } }`. ' +
          'Switch on `error.code`; `message` is for humans and will change.',
      ].join('\n'),
    },
    servers: [{ url: '/', description: 'This server' }],
    tags: [
      { name: 'Health' },
      { name: 'Categories' },
      { name: 'Places' },
      { name: 'Search' },
      { name: 'Admin: reads', description: 'Raw rows, including inactive ones.' },
      { name: 'Admin: categories' },
      { name: 'Admin: places' },
      { name: 'Admin: images' },
    ],
    paths,
    components: {
      securitySchemes: {
        ApiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: "The Worker's ADMIN_API_KEY secret.",
        },
      },
      parameters: parameters(languages),
      schemas: {
        Category: schema(CategorySchema, 'output'),
        Place: schema(PlaceSchema, 'output'),
        PlaceSummary: schema(PlaceSummarySchema, 'output'),
        PlaceImage: schema(PlaceImageSchema, 'output'),
        Meta: schema(MetaSchema, 'output'),
        Error: schema(ErrorResponseSchema, 'output'),
        Health: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['ok', 'degraded'] },
                database: { type: 'string', enum: ['ok', 'unreachable'] },
                latency_ms: { type: 'integer' },
              },
            },
          },
        },
        CreateCategory: schema(CreateCategorySchema, 'input'),
        UpdateCategory: schema(UpdateCategorySchema, 'input'),
        CreatePlace: schema(CreatePlaceSchema, 'input'),
        UpdatePlace: schema(UpdatePlaceSchema, 'input'),
        CreatePlaceImage: schema(CreatePlaceImageSchema, 'input'),
        ReorderImages: schema(ReorderImagesSchema, 'input'),
        CategoryRow,
        PlaceRow,
        ImageRow,
      },
    },
  }

  cached = { languages: env.SUPPORTED_LANGS, spec }
  return spec
}
