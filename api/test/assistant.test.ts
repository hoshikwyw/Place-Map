import Rabbit from 'rabbit-node'
import { describe, expect, it } from 'vitest'
import { MYANMAR_STOP_PHRASES, NEAR_WORDS, OPEN_WORDS, SYNONYM_GROUPS } from '../src/assistant/keywords'
import { canonical, parseMessage, type CategoryTerms } from '../src/assistant/parse'
import { reply, type ReplyInput } from '../src/assistant/reply'
import { looksLikeZawgyi, toUnicode } from '../src/assistant/zawgyi'
import { boundingBox, distanceMeters } from '../src/lib/geo'
import worker from '../src/index'
import type { Env } from '../src/types'

/** The seed categories, as the route passes them to the parser. */
const CATEGORIES: CategoryTerms[] = [
  { id: 1, slug: 'cafes', names: ['Cafes', 'ကော်ဖီဆိုင်များ'] },
  { id: 2, slug: 'restaurants', names: ['Restaurants', 'စားသောက်ဆိုင်များ'] },
  { id: 3, slug: 'parks', names: ['Parks', 'ပန်းခြံများ'] },
  { id: 4, slug: 'museums', names: ['Museums', 'ပြတိုက်များ'] },
  { id: 5, slug: 'shopping', names: ['Shopping', 'ဈေးဝယ်စင်တာများ'] },
]

const parse = (message: string) => parseMessage(message, CATEGORIES)

describe('assistant: English', () => {
  it('reads the example request', () => {
    expect(parse('find the cafe near my location')).toEqual({
      categoryId: 1,
      nearMe: true,
      radiusKm: null,
      openNow: false,
      keywords: [],
    })
  })

  it('matches plurals, synonyms, case and punctuation', () => {
    expect(parse('Coffee shops nearby?').categoryId).toBe(1)
    expect(parse('CAFÉ').categoryId).toBe(1)
    expect(parse('where can I eat').categoryId).toBe(2)
    expect(parse('a museum').categoryId).toBe(4)
    expect(parse('gardens').categoryId).toBe(3)
  })

  it('prefers the longer phrase: "coffee shop" is a cafe, not shopping', () => {
    expect(parse('coffee shop').categoryId).toBe(1)
    expect(parse('shop').categoryId).toBe(5)
  })

  it('matches whole words only', () => {
    expect(parse('cafeteria').categoryId).toBeNull()
    expect(parse('parking').categoryId).toBeNull()
  })

  it('reads "open now" and a distance, which implies near me', () => {
    expect(parse('restaurants open now')).toMatchObject({ categoryId: 2, openNow: true, nearMe: false })
    expect(parse('parks within 2 km')).toMatchObject({ categoryId: 3, nearMe: true, radiusKm: 2 })
    expect(parse('cafe 500m')).toMatchObject({ categoryId: 1, nearMe: true, radiusKm: 0.5 })
    expect(parse('cafe within 1.5km')).toMatchObject({ radiusKm: 1.5 })
    expect(parse('cafe within 900 km').radiusKm).toBe(50)
  })

  it('keeps unrecognised words as search keywords, without filler', () => {
    expect(parse('show me noodle places near me please')).toMatchObject({ nearMe: true, keywords: ['noodle'] })
    expect(parse('mohinga')).toMatchObject({ categoryId: null, keywords: ['mohinga'] })
  })

  it('understands nothing in small talk', () => {
    expect(parse('hi there')).toEqual({ categoryId: null, nearMe: false, radiusKm: null, openNow: false, keywords: [] })
  })

  it('ignores synonym groups with no matching category', () => {
    // No hotel category in this set: "hotel" is only a keyword.
    expect(parse('hotel')).toMatchObject({ categoryId: null, keywords: ['hotel'] })
  })

  it('uses categories created in the dashboard, with synonyms', () => {
    const withHotels = [...CATEGORIES, { id: 9, slug: 'hotels', names: ['Hotels', 'ဟိုတယ်များ'] }]
    expect(parseMessage('guesthouse near me', withHotels)).toMatchObject({ categoryId: 9, nearMe: true })
  })
})

describe('assistant: Myanmar', () => {
  it('reads category, near and open words', () => {
    expect(parse('အနီးက ကော်ဖီဆိုင်')).toEqual({
      categoryId: 1,
      nearMe: true,
      radiusKm: null,
      openNow: false,
      keywords: [],
    })
    expect(parse('အခုဖွင့်ထားတဲ့ စားသောက်ဆိုင်')).toMatchObject({ categoryId: 2, openNow: true, keywords: [] })
    expect(parse('ကျွန်တော့်အနီးက ကော်ဖီဆိုင်ရှာပေးပါ')).toMatchObject({ categoryId: 1, nearMe: true, keywords: [] })
    expect(parse('ပန်းခြံ ဘယ်မှာရှိလဲ')).toMatchObject({ categoryId: 3, keywords: [] })
  })

  it('matches the short form of a category name', () => {
    expect(parse('ကော်ဖီ').categoryId).toBe(1)
    expect(parse('ပြတိုက်').categoryId).toBe(4)
  })

  it('reads Myanmar digits in a distance', () => {
    expect(parse('၂ ကီလိုမီတာအတွင်း ကော်ဖီဆိုင်')).toMatchObject({ categoryId: 1, nearMe: true, radiusKm: 2 })
  })

  it('accepts the asat and dot-below in either order', () => {
    const swapped = 'ဖွင့်ထားတဲ့ စားသောက်ဆိုင်'.replace(/\u1037\u103A/g, '\u103A\u1037')
    expect(parse(swapped)).toMatchObject({ categoryId: 2, openNow: true })
  })

  it('keeps a Myanmar dish name as a keyword', () => {
    expect(parse('မုန့်ဟင်းခါး')).toMatchObject({ categoryId: null, keywords: ['မုန့်ဟင်းခါး'] })
  })

  it('reads the same requests typed in Zawgyi', () => {
    for (const message of ['အနီးက ကော်ဖီဆိုင်', 'အခုဖွင့်ထားတဲ့ စားသောက်ဆိုင်', 'ကျွန်တော့်အနီးက ကော်ဖီဆိုင်ရှာပေးပါ']) {
      const zawgyi = Rabbit.uni2zg(message)
      expect(zawgyi).not.toBe(message)
      expect(parse(zawgyi)).toEqual(parse(message))
    }
  })
})

describe('Zawgyi detection', () => {
  /** Every Myanmar word the assistant knows, plus sentences and the seed data. */
  const unicode = [
    ...SYNONYM_GROUPS.flat(),
    ...NEAR_WORDS,
    ...OPEN_WORDS,
    ...MYANMAR_STOP_PHRASES,
    ...CATEGORIES.flatMap((c) => c.names),
    'ကဖေး စင်ထရယ်',
    'ခေါက်ဆွဲဆိုင်',
    'အပြင်ဘက်တွင် ထိုင်ခုံများပါရှိသော သေးငယ်သည့် ကော်ဖီဆိုင်။',
    'မုန့်ဟင်းခါးနှင့် ခေါက်ဆွဲဟင်းလျာများ၊ နံနက်တိုင်း ရောင်းသည်။',
    'ကျေးဇူးပြု၍ အနီးဆုံး ဆေးရုံကို ပြပေးပါ',
  ].filter((text) => /[\u1000-\u109F]/.test(text))

  it('leaves Unicode text alone', () => {
    const misread = unicode.filter((text) => looksLikeZawgyi(text))
    expect(misread).toEqual([])
    for (const text of unicode) expect(toUnicode(text)).toBe(text)
  })

  it('detects and converts Zawgyi sentences', () => {
    const sentences = unicode.filter((text) => text.includes(' ') && Rabbit.uni2zg(text) !== text)
    expect(sentences.length).toBeGreaterThan(3)
    for (const text of sentences) {
      const zawgyi = Rabbit.uni2zg(text)
      expect({ text, detected: looksLikeZawgyi(zawgyi) }).toEqual({ text, detected: true })
      expect(canonical(toUnicode(zawgyi))).toBe(canonical(text))
    }
  })

  it('reads every keyword typed in Zawgyi the same as in Unicode', () => {
    // Some single words have no Zawgyi tell ("ကဖေး" typed in Zawgyi is also a
    // valid Unicode sequence); the parser reads those both ways.
    const words = [...SYNONYM_GROUPS.flat(), ...NEAR_WORDS, ...OPEN_WORDS, ...CATEGORIES.flatMap((c) => c.names)]
    const withHotels = [...CATEGORIES, { id: 9, slug: 'hotels', names: ['Hotels'] }, { id: 10, slug: 'banks', names: ['Banks'] }]
    const myanmarWords = words.filter((w) => /[\u1000-\u109F]/.test(w))
    // A word that names nothing (petrol, with no fuel category) stays a keyword either way.
    const meaningful = myanmarWords.filter((w) => {
      const intent = parseMessage(w, withHotels)
      return intent.categoryId !== null || intent.nearMe || intent.openNow
    })
    expect(meaningful.length).toBeGreaterThan(30)
    for (const word of meaningful) {
      expect({ word, intent: parseMessage(Rabbit.uni2zg(word), withHotels) }).toEqual({
        word,
        intent: parseMessage(word, withHotels),
      })
    }
  })
})

describe('geo', () => {
  const sule = { lat: 16.7746, lng: 96.1588 }
  const shwedagon = { lat: 16.7983, lng: 96.1497 }

  it('measures distance', () => {
    expect(distanceMeters(sule, sule)).toBe(0)
    // About 2.8 km between the two pagodas.
    expect(distanceMeters(sule, shwedagon)).toBeGreaterThan(2_700)
    expect(distanceMeters(sule, shwedagon)).toBeLessThan(2_900)
  })

  it('draws a box that contains the whole radius', () => {
    const box = boundingBox(sule, 5)
    for (const bearing of [0, 45, 90, 135, 180, 225, 270, 315]) {
      const rad = (bearing * Math.PI) / 180
      // A point roughly 4.9 km away in each direction.
      const point = {
        lat: sule.lat + (4.9 / 111.32) * Math.cos(rad),
        lng: sule.lng + (4.9 / (111.32 * Math.cos((sule.lat * Math.PI) / 180))) * Math.sin(rad),
      }
      expect(point.lat).toBeGreaterThanOrEqual(box.minLat)
      expect(point.lat).toBeLessThanOrEqual(box.maxLat)
      expect(point.lng).toBeGreaterThanOrEqual(box.minLng)
      expect(point.lng).toBeLessThanOrEqual(box.maxLng)
    }
  })
})

describe('assistant replies', () => {
  const base: ReplyInput = {
    kind: 'found',
    category: 'Cafes',
    keywords: [],
    openNow: false,
    nearMe: true,
    sortedByDistance: true,
    radiusKm: 5,
    widenedToKm: null,
    droppedKeywords: [],
  }

  it('speaks both languages', () => {
    expect(reply('en', base)).toBe('Here are cafes near you, nearest first.')
    expect(reply('my', { ...base, category: 'ကော်ဖီဆိုင်များ' })).toContain('ကော်ဖီဆိုင်များ')
    expect(reply('en', { ...base, kind: 'needs_location' })).toBe("Share your location and I'll find cafes near you.")
    expect(reply('en', { ...base, widenedToKm: 50 })).toBe('Nothing within 5 km, so here are the closest cafes.')
    expect(reply('en', { ...base, kind: 'none', openNow: true, widenedToKm: 50 })).toBe(
      'Sorry, there are no cafes open now within 50 km of you.',
    )
  })
})

describe('GET /v1/assistant validation', () => {
  const env = {
    DEFAULT_LANG: 'en',
    SUPPORTED_LANGS: 'en,my',
    ADMIN_API_KEY: 'unused-here',
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'unused-here',
    IMAGEKIT_URL_ENDPOINT: '',
  } as Env
  const ctx = { waitUntil() {}, passThroughOnException() {} } as unknown as ExecutionContext
  const get = (query: string) => worker.fetch(new Request(`https://api.test/v1/assistant${query}`), env, ctx)

  it('rejects bad input before touching the database', async () => {
    for (const query of ['', '?q=', '?q=cafe&lat=16.7', '?q=cafe&lat=100&lng=96', '?q=cafe&limit=21']) {
      const res = await get(query)
      expect({ query, status: res.status }).toEqual({ query, status: 400 })
    }
  })

  it('is a public read: no API key needed', async () => {
    const res = await get('?q=')
    expect(res.status).not.toBe(401)
  })
})
