import { Hono } from 'hono'
import { light } from '@place-map/shared'
import { openApiSpec } from '../openapi.js'
import type { AppBindings } from '../types.js'

export const docs = new Hono<AppBindings>()

/** Pinned exactly: a floating "latest" would change the page under you. */
const SWAGGER_UI_VERSION = '5.32.15'
const CDN = `https://cdn.jsdelivr.net/npm/swagger-ui-dist@${SWAGGER_UI_VERSION}`

// GET /openapi.json - for Swagger UI, Postman, Insomnia or code generators.
docs.get('/openapi.json', (c) => {
  c.header('Cache-Control', 'public, max-age=300')
  return c.json(openApiSpec(c.env))
})

/**
 * GET /docs - Swagger UI, for trying the API from a browser.
 *
 * Served from the Worker itself, so "Try it out" requests are same-origin and
 * work for every method, admin writes included. The CORS policy on /v1 only
 * governs other sites; a key pasted here is spent only by the person who
 * pasted it, and it stays in that browser's local storage.
 */
docs.get('/docs', (c) => {
  c.header('Cache-Control', 'public, max-age=3600')
  return c.html(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Place Map API</title>
    <link rel="stylesheet" href="${CDN}/swagger-ui.css" />
    <style>
      body { margin: 0; background: ${light.canvas}; }
      .swagger-ui .info .title { color: ${light.ink}; }
      .swagger-ui .btn.execute, .swagger-ui .btn.authorize {
        background: ${light.accent}; border-color: ${light.accent}; color: ${light.onAccent};
      }
      .swagger-ui .btn.authorize svg { fill: ${light.onAccent}; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="${CDN}/swagger-ui-bundle.js" crossorigin></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: '/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        // Keeps the pasted API key across reloads, in this browser only.
        persistAuthorization: true,
        tryItOutEnabled: true,
        displayRequestDuration: true,
        filter: true,
        docExpansion: 'list',
        defaultModelsExpandDepth: 0,
      })
    </script>
  </body>
</html>`)
})
