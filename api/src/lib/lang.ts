import type { MiddlewareHandler } from 'hono'
import type { AppBindings, Env } from '../types.js'

/**
 * The database stores `{"en": "...", "my": "..."}`. Clients never see that
 * shape - every response carries one string, chosen here.
 *
 * Precedence: `?lang=` beats `Accept-Language` beats DEFAULT_LANG.
 */

const supported = (env: Env): string[] =>
  env.SUPPORTED_LANGS.split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)

/** Parses `my-MM,my;q=0.9,en;q=0.8` into base subtags, best quality first. */
function parseAcceptLanguage(header: string): string[] {
  return header
    .split(',')
    .map((part) => {
      const [tag = '', ...params] = part.trim().split(';')
      const q = params
        .map((p) => p.trim())
        .find((p) => p.startsWith('q='))
        ?.slice(2)
      return { tag: tag.trim().toLowerCase().split('-')[0] ?? '', q: q ? Number(q) : 1 }
    })
    .filter((entry) => entry.tag && Number.isFinite(entry.q))
    .sort((a, b) => b.q - a.q)
    .map((entry) => entry.tag)
}

export const langMiddleware: MiddlewareHandler<AppBindings> = async (c, next) => {
  const allowed = supported(c.env)
  const fallback = c.env.DEFAULT_LANG.toLowerCase()

  const requested = c.req.query('lang')?.trim().toLowerCase()
  if (requested && allowed.includes(requested)) {
    c.set('lang', requested)
  } else {
    const header = c.req.header('Accept-Language')
    const matched = header ? parseAcceptLanguage(header).find((t) => allowed.includes(t)) : undefined
    c.set('lang', matched ?? fallback)
  }

  // Same URL, different language, different body - without this, a shared cache
  // could hand a Myanmar response to an English client.
  c.header('Vary', 'Accept-Language')
  c.header('Content-Language', c.get('lang'))
  await next()
}

/**
 * Flattens a localized jsonb value to one string.
 * Falls back to the default language, then to any locale that exists, so a
 * half-translated row still renders something rather than an empty card.
 */
export function pickText(value: unknown, lang: string, fallbackLang: string): string | null {
  if (value == null) return null
  if (typeof value === 'string') return value // tolerated: plain text column
  if (typeof value !== 'object') return null

  const map = value as Record<string, unknown>
  for (const key of [lang, fallbackLang]) {
    const hit = map[key]
    if (typeof hit === 'string' && hit.trim()) return hit
  }
  for (const hit of Object.values(map)) {
    if (typeof hit === 'string' && hit.trim()) return hit
  }
  return null
}
