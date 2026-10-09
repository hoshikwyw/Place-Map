import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setInternalDispatcher } from '../src/bot/api-client'
import { decode } from '../src/bot/keyboards'
import worker from '../src/index'
import type { Env } from '../src/types'

/**
 * The bot end to end: a real Telegram update goes through the real webhook and
 * the real handlers, with only the two edges replaced - the Telegram API it
 * calls out to, and the /v1 API it reads from. What the bot would have sent is
 * then asserted, which is the only way to reach the parts no unit test does:
 * the webhook's secret check, the work deferred to waitUntil, the screen each
 * update produces, and whether a shared location is answered at all.
 */

const env = {
  DEFAULT_LANG: 'en',
  SUPPORTED_LANGS: 'en,my',
  TELEGRAM_BOT_TOKEN: 'test-token',
  TELEGRAM_WEBHOOK_SECRET: 'test-secret',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'unused-here',
  IMAGEKIT_URL_ENDPOINT: 'https://img.test',
  ADMIN_API_KEY: 'unused-here',
} as Env

/** Everything the handlers hand to waitUntil, so a test can await the work. */
let background: Promise<unknown>[] = []
const ctx = {
  waitUntil: (promise: Promise<unknown>) => background.push(promise),
  passThroughOnException() {},
} as unknown as ExecutionContext

interface Sent {
  method: string
  payload: Record<string, any>
}
let sent: Sent[] = []

const CATEGORIES = [
  { id: 1, slug: 'cafes', name: 'Cafes', icon: '☕' },
  { id: 2, slug: 'parks', name: 'Parks', icon: '\u{1f333}' },
]

const nearby = (id: number, name: string, distance: number) => ({
  id,
  slug: `p${id}`,
  category: CATEGORIES[0],
  name,
  description: null,
  address: null,
  location: { lat: 16.8, lng: 96.1 },
  phone: null,
  website: null,
  opening_hours: null,
  image: null,
  links: [],
  rating: 4.6,
  rating_count: 128,
  distance_m: distance,
})

const AMENITIES = [
  { id: 1, slug: 'wifi', name: 'Wi-Fi', icon: '📶', icon_image: null },
  { id: 2, slug: 'parking', name: 'Parking', icon: null, icon_image: null },
]

const DETAILED = {
  id: 11,
  slug: 'cafe-central',
  category: CATEGORIES[0],
  name: 'Cafe Central',
  description: 'Small specialty coffee bar.',
  address: '12 Pansodan St, Yangon',
  location: { lat: 16.8, lng: 96.1 },
  phone: '+959123456789',
  website: null,
  opening_hours: { mon: [['09:00', '18:00']], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] },
  images: [],
  links: [],
  rating: 4.6,
  rating_count: 128,
  price: { level: 2, min: 3000, max: 8000, currency: 'MMK' },
  amenities: ['wifi', 'parking', 'retired_slug'],
}

/** Set to make /v1/amenities fail, the way an API before migration 0007 does. */
let amenitiesFail = false

/** The /v1 calls the bot makes, answered from fixtures instead of Supabase. */
let assistantCalls: URL[] = []

function stubApi() {
  setInternalDispatcher(async (request) => {
    const url = new URL(request.url)
    const json = (body: unknown) =>
      new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })

    if (url.pathname === '/v1/categories') return json({ data: CATEGORIES, meta: {} })

    if (url.pathname === '/v1/amenities') {
      if (amenitiesFail) {
        return new Response(
          JSON.stringify({ error: { code: 'internal', message: 'no such table' } }),
          { status: 500, headers: { 'Content-Type': 'application/json' } },
        )
      }
      return json({ data: AMENITIES, meta: {} })
    }

    if (url.pathname === '/v1/places/11') return json({ data: DETAILED })

    if (url.pathname === '/v1/assistant') {
      assistantCalls.push(url)
      const query = url.searchParams.get('q') ?? ''
      const hasPoint = url.searchParams.has('lat')

      if (query === 'cafe near me' && !hasPoint) {
        return json({
          data: {
            reply: 'Share your location and I will find cafes near you.',
            needs_location: true,
            understood: {
              category: CATEGORIES[0],
              near_me: true,
              radius_km: null,
              open_now: false,
              keywords: [],
            },
            places: [],
          },
        })
      }

      return json({
        data: {
          reply: 'Here are cafes near you, nearest first.',
          needs_location: false,
          understood: {
            category: CATEGORIES[0],
            near_me: true,
            radius_km: null,
            open_now: false,
            keywords: [],
          },
          places: [nearby(11, 'Cafe Central', 320), nearby(12, 'Eain', 1500)],
        },
      })
    }

    return json({ error: { code: 'not_found', message: url.pathname } })
  })
}

beforeEach(() => {
  background = []
  sent = []
  assistantCalls = []
  amenitiesFail = false
  stubApi()

  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    sent.push({
      method: url.split('/').pop() ?? '',
      payload: JSON.parse(String(init?.body ?? '{}')),
    })
    return new Response(JSON.stringify({ ok: true, result: { message_id: 500 } }), {
      headers: { 'Content-Type': 'application/json' },
    })
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/** Posts an update the way Telegram does, then waits for the deferred work. */
async function deliver(update: unknown, secret = 'test-secret') {
  const response = await worker.fetch(
    new Request('https://api.test/webhook/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Telegram-Bot-Api-Secret-Token': secret },
      body: JSON.stringify(update),
    }),
    env,
    ctx,
  )
  await Promise.all(background)
  return response
}

const message = (fields: Record<string, unknown>) => ({
  update_id: 1,
  message: {
    message_id: 10,
    chat: { id: 99, type: 'private' },
    from: { id: 7, language_code: 'en' },
    ...fields,
  },
})

const buttonTexts = (payload: Record<string, any>): string[] =>
  payload.reply_markup.inline_keyboard.flat().map((button: any) => button.text)

describe('the bot, end to end', () => {
  it('refuses an update that does not carry Telegram s secret', async () => {
    const response = await deliver(message({ text: '/start' }), 'wrong')
    expect(response.status).toBe(401)
    expect(sent).toHaveLength(0)
  })

  it('refuses a secret that is merely the right length', async () => {
    // The compare must not leak where it stopped matching.
    const response = await deliver(message({ text: '/start' }), 'test-secreT')
    expect(response.status).toBe(401)
    expect(sent).toHaveLength(0)
  })

  it('refuses an update when no secret is configured at all', async () => {
    const response = await worker.fetch(
      new Request('https://api.test/webhook/telegram', {
        method: 'POST',
        headers: { 'X-Telegram-Bot-Api-Secret-Token': '' },
        body: '{}',
      }),
      { ...env, TELEGRAM_WEBHOOK_SECRET: '' } as Env,
      ctx,
    )
    expect(response.status).toBe(401)
  })

  it('answers /start with the categories and a way to share a location', async () => {
    await deliver(message({ text: '/start' }))

    const texts = sent.filter((call) => call.method === 'sendMessage')
    expect(texts).toHaveLength(2)

    // Only a reply keyboard can ask for a location; an inline button cannot.
    expect(texts[0]!.payload.reply_markup.keyboard[0][0].request_location).toBe(true)
    expect(buttonTexts(texts[1]!.payload)).toEqual(['☕ Cafes', '\u{1f333} Parks'])
  })

  it('sends a typed question to the assistant and lists what it found', async () => {
    await deliver(message({ text: 'cafes' }))

    expect(assistantCalls).toHaveLength(1)
    expect(assistantCalls[0]!.searchParams.get('q')).toBe('cafes')

    const answer = sent.find((call) => call.method === 'sendMessage')!.payload
    expect(answer.text).toContain('Here are cafes near you')
    expect(buttonTexts(answer)[0]).toBe('Cafe Central')
  })

  it('asks for a location when the question needs one', async () => {
    await deliver(message({ text: 'cafe near me' }))

    const answer = sent.find((call) => call.method === 'sendMessage')!.payload
    expect(answer.text).toContain('Share your location')
    expect(answer.text).toContain('not saved')
    expect(answer.reply_markup.keyboard[0][0].request_location).toBe(true)
  })

  it('answers a shared location with the nearest places and their distances', async () => {
    await deliver(message({ location: { latitude: 16.7761234, longitude: 96.1603456 } }))

    const call = assistantCalls[0]!
    expect(call.searchParams.get('lat')).toBe('16.7761234')
    expect(call.searchParams.get('q')).toBe('near me')

    const screen = sent.find((entry) => entry.method === 'sendMessage')!.payload
    expect(buttonTexts(screen)).toContain('Cafe Central · 320 m')
    expect(buttonTexts(screen)).toContain('Eain · 1.5 km')

    // The point rides in the buttons; nothing about the user is kept.
    const place = screen.reply_markup.inline_keyboard[0][0]
    expect(decode(place.callback_data)).toMatchObject({
      type: 'nearPlace',
      id: 11,
      at: { lat: 16.7761, lng: 96.1603 },
    })
  })

  it('narrows the same point to one category when that button is tapped', async () => {
    await deliver({
      update_id: 2,
      callback_query: {
        id: 'cb1',
        from: { id: 7, language_code: 'en' },
        data: 'n:1:16.7761:96.1603:1',
        message: { message_id: 10, chat: { id: 99, type: 'private' } },
      },
    })

    // Answered immediately, or the button spins in the client.
    expect(sent[0]!.method).toBe('answerCallbackQuery')
    expect(assistantCalls[0]!.searchParams.get('q')).toBe('Cafes near me')
    expect(assistantCalls[0]!.searchParams.get('lat')).toBe('16.7761')

    // Navigation edits the screen in place rather than stacking a new one.
    expect(sent.some((call) => call.method === 'editMessageText')).toBe(true)
  })

  /**
   * Opening a place is where the bot reads two things at once - the place and
   * the amenity catalog - so what reaches Telegram is the only proof the
   * second one is wired in at all.
   */
  describe('opening a place', () => {
    const open = () =>
      deliver({
        update_id: 3,
        callback_query: {
          id: 'cb-place',
          from: { id: 7, language_code: 'en' },
          data: 'p:11:1:1',
          message: { message_id: 10, chat: { id: 99, type: 'private' } },
        },
      })

    /**
     * A place arrives as a photo caption when it has an image and as message
     * text when it does not, and both paths have to carry the same thing.
     */
    const screen = () => {
      const call = sent.find((sent) =>
        ['sendPhoto', 'editMessageMedia', 'editMessageText', 'sendMessage'].includes(sent.method),
      )
      return (call?.payload.caption ?? call?.payload.text ?? '') as string
    }

    it('says what the place costs', async () => {
      await open()
      expect(screen()).toContain('Moderate')
      expect(screen()).toContain('3,000–8,000 Ks per person')
    })

    it('lists the amenities by name', async () => {
      await open()
      expect(screen()).toContain('Wi-Fi')
      expect(screen()).toContain('Parking')
    })

    it('drops a slug the catalog no longer knows', async () => {
      await open()
      expect(screen()).not.toContain('retired_slug')
    })

    it('still shows the place when the catalog cannot be read', async () => {
      // What an API deployed before migration 0007 does. The chips are worth
      // losing; the address and the hours are not.
      amenitiesFail = true
      await open()

      const text = screen()
      expect(text).toContain('12 Pansodan St')
      expect(text).toContain('09:00-18:00')
      expect(text).toContain('Moderate')
      expect(text).not.toContain('Wi-Fi')
    })

    it('tells the user when the place itself is gone', async () => {
      setInternalDispatcher(
        async () =>
          new Response(JSON.stringify({ error: { code: 'not_found', message: 'gone' } }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }),
      )
      await open()
      expect(screen()).toContain('no longer listed')
    })
  })

  it('shrugs off an edit Telegram calls unmodified', async () => {
    // Tapping the same button twice sends the same callback twice, and the
    // second edit has nothing to change. Telegram answers 400 for that, which
    // must not reach the user as "Something went wrong".
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = url.split('/').pop() ?? ''
      sent.push({ method, payload: JSON.parse(String(init?.body ?? '{}')) })

      if (method === 'editMessageText') {
        return new Response(
          JSON.stringify({
            ok: false,
            error_code: 400,
            description:
              'Bad Request: message is not modified: specified new message content and reply markup are exactly the same as a current content and reply markup of the message',
          }),
          { headers: { 'Content-Type': 'application/json' } },
        )
      }

      return new Response(JSON.stringify({ ok: true, result: { message_id: 500 } }), {
        headers: { 'Content-Type': 'application/json' },
      })
    })

    await deliver({
      update_id: 9,
      callback_query: {
        id: 'cb-same',
        from: { id: 7, language_code: 'en' },
        data: 'home',
        message: { message_id: 10, chat: { id: 99, type: 'private' } },
      },
    })

    const complaints = sent.filter(
      (call) => call.method === 'sendMessage' && String(call.payload.text).includes('went wrong'),
    )
    expect(complaints).toHaveLength(0)
  })

  it('speaks Myanmar to a Myanmar client, chrome included', async () => {
    await deliver({
      update_id: 3,
      message: {
        message_id: 11,
        chat: { id: 99, type: 'private' },
        from: { id: 7, language_code: 'my-MM' },
        location: { latitude: 16.7761, longitude: 96.1603 },
      },
    })

    expect(assistantCalls[0]!.searchParams.get('q')).toBe('အနီးအနား')

    const screen = sent.find((entry) => entry.method === 'sendMessage')!.payload
    expect(screen.text).toContain('သင့်အနီး')
    expect(buttonTexts(screen)).toContain('Cafe Central · 320 မီတာ')
    expect(buttonTexts(screen).at(-1)).toBe('⌂ အမျိုးအစားများ')
  })

  it('never shows a location button where Telegram would drop it', async () => {
    await deliver({
      update_id: 4,
      message: {
        message_id: 12,
        chat: { id: -100, type: 'supergroup' },
        from: { id: 7, language_code: 'en' },
        text: '/nearby',
      },
    })

    const answer = sent.find((call) => call.method === 'sendMessage')!.payload
    expect(answer.reply_markup).toBeUndefined()
    expect(answer.text).toContain('private chat')
  })

  it('still returns 200 for a body Telegram should not have sent', async () => {
    // Anything else and Telegram redelivers the same broken update forever.
    const response = await worker.fetch(
      new Request('https://api.test/webhook/telegram', {
        method: 'POST',
        headers: { 'X-Telegram-Bot-Api-Secret-Token': 'test-secret' },
        body: 'not json',
      }),
      env,
      ctx,
    )
    expect(response.status).toBe(200)
  })
})
