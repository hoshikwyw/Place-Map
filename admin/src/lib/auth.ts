import 'server-only'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { env } from './env'

/**
 * One admin, one password, a signed cookie.
 *
 * No user table and no Supabase Auth: there is exactly one operator, and a
 * login system with accounts, resets and sessions would be more code - and more
 * attack surface - than the thing it protects.
 *
 * The cookie carries an expiry and an HMAC over it. Nothing else is stored, so
 * there is no session table to keep, and changing SESSION_SECRET logs everyone
 * out immediately.
 */

const COOKIE = 'place_map_session'
const MAX_AGE_SECONDS = 60 * 60 * 12

const encoder = new TextEncoder()

async function key(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(env.sessionSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function sign(payload: string): Promise<string> {
  const signature = await crypto.subtle.sign('HMAC', await key(), encoder.encode(payload))
  return `${payload}.${toHex(signature)}`
}

async function verify(token: string): Promise<boolean> {
  const separator = token.lastIndexOf('.')
  if (separator < 1) return false

  const payload = token.slice(0, separator)
  const signature = token.slice(separator + 1)

  const expected = await sign(payload)
  if (expected !== `${payload}.${signature}`) return false

  const expiresAt = Number(payload)
  return Number.isFinite(expiresAt) && expiresAt > Date.now()
}

/**
 * Compares the typed password without leaking its length or a matching prefix
 * through response timing.
 */
export function passwordMatches(candidate: string): boolean {
  const a = encoder.encode(candidate)
  const b = encoder.encode(env.password)

  let diff = a.length ^ b.length
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0)
  }
  return diff === 0
}

export async function startSession(): Promise<void> {
  const token = await sign(String(Date.now() + MAX_AGE_SECONDS * 1000))
  const store = await cookies()

  store.set(COOKIE, token, {
    httpOnly: true, // script on the page cannot read it
    sameSite: 'lax', // not sent from another site's form post
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  })
}

export async function endSession(): Promise<void> {
  const store = await cookies()
  store.delete(COOKIE)
}

export async function isSignedIn(): Promise<boolean> {
  const token = (await cookies()).get(COOKIE)?.value
  return token ? verify(token) : false
}

/** Guards a page. Every authenticated route calls this before rendering. */
export async function requireSession(): Promise<void> {
  if (!(await isSignedIn())) redirect('/login')
}
