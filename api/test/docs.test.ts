import { describe, expect, it } from 'vitest'
import { app } from '../src/app'
import worker from '../src/index'
import type { Env } from '../src/types'

const env = {
  DEFAULT_LANG: 'en',
  SUPPORTED_LANGS: 'en,my',
  ADMIN_API_KEY: 'unused-here',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'unused-here',
  IMAGEKIT_URL_ENDPOINT: '',
} as Env

const ctx = { waitUntil() {}, passThroughOnException() {} } as unknown as ExecutionContext

const get = (path: string) => worker.fetch(new Request(`https://api.test${path}`), env, ctx)

interface Spec {
  openapi: string
  paths: Record<string, Record<string, { security?: unknown[] }>>
  components: { securitySchemes: Record<string, unknown>; parameters: Record<string, { schema: { enum?: string[] } }> }
}

/** `:id` and `{idOrSlug}` are the same path to a router; compare shapes, not names. */
const shape = (method: string, path: string) =>
  `${method.toUpperCase()} ${path.replace(/:\w+|\{\w+\}/g, '{}')}`

describe('OpenAPI document', () => {
  it('is served as OpenAPI 3.1 with the API-key scheme', async () => {
    const res = await get('/openapi.json')
    expect(res.status).toBe(200)

    const spec = (await res.json()) as Spec
    expect(spec.openapi).toBe('3.1.0')
    expect(spec.components.securitySchemes.ApiKey).toMatchObject({ type: 'apiKey', in: 'header', name: 'X-API-Key' })
  })

  it('describes every /v1 route the Worker mounts, and nothing it does not', async () => {
    const spec = (await (await get('/openapi.json')).json()) as Spec

    const documented = new Set(
      Object.entries(spec.paths).flatMap(([path, operations]) =>
        Object.keys(operations).map((method) => shape(method, path)),
      ),
    )

    const mounted = new Set(
      app.routes
        .filter((route) => route.path.startsWith('/v1/') && !route.path.includes('*'))
        .filter((route) => ['GET', 'POST', 'PATCH', 'DELETE'].includes(route.method))
        .map((route) => shape(route.method, route.path)),
    )

    // A new endpoint without documentation, or documentation for a removed one,
    // fails here rather than surprising someone testing in /docs.
    expect([...mounted].filter((route) => !documented.has(route))).toEqual([])
    expect([...documented].filter((route) => !mounted.has(route))).toEqual([])
  })

  it('never declares two equivalent templated paths, which OpenAPI forbids', async () => {
    const spec = (await (await get('/openapi.json')).json()) as Spec
    const shapes = Object.keys(spec.paths).map((path) => path.replace(/\{\w+\}/g, '{}'))
    expect(shapes.length).toBe(new Set(shapes).size)
  })

  it('marks every write and admin read as needing the API key', async () => {
    const spec = (await (await get('/openapi.json')).json()) as Spec

    for (const [path, operations] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(operations)) {
        const needsKey = method !== 'get' || path.startsWith('/v1/admin/')
        expect(Boolean(operation.security), `${method.toUpperCase()} ${path}`).toBe(needsKey)
      }
    }
  })

  it('offers exactly the languages the Worker is configured for', async () => {
    const spec = (await (await get('/openapi.json')).json()) as Spec
    expect(spec.components.parameters.Lang!.schema.enum).toEqual(['en', 'my'])
  })
})

describe('Swagger UI', () => {
  it('serves the docs page, pinned to an exact Swagger UI version', async () => {
    const res = await get('/docs')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')

    const html = await res.text()
    expect(html).toMatch(/swagger-ui-dist@\d+\.\d+\.\d+\//)
    expect(html).toContain("url: '/openapi.json'")
  })
})
