import { ASSISTANT_RADIUS_KM_MAX } from '@place-map/shared'
import {
  DISTANCE_PATTERNS,
  MYANMAR_STOP_PHRASES,
  NEAR_WORDS,
  OPEN_WORDS,
  STOP_WORDS,
  SYNONYM_GROUPS,
} from './keywords.js'
import { looksLikeZawgyi, zawgyiToUnicode } from './zawgyi.js'

/** A category as the parser needs it: every language's name, not just one. */
export interface CategoryTerms {
  id: number
  slug: string
  names: string[]
}

/** What a message asks for. Everything is optional; an empty intent means "not understood". */
export interface Intent {
  categoryId: number | null
  nearMe: boolean
  radiusKm: number | null
  openNow: boolean
  /** Words that matched nothing above - searched for in place names and descriptions. */
  keywords: string[]
}

/*
 * CPU budget: a Worker gets 10 ms per request. So this avoids what is costly on
 * a cold isolate - compiling a regex per word, and the Unicode tables behind
 * `\p{...}` classes and normalize() - and matches words with plain string
 * searches instead. Word lists are prepared once per isolate, category words
 * once per category set.
 */

const MAX_KEYWORDS = 3
const MAX_KEYWORD_LENGTH = 40
/** Shorter Myanmar fragments are particles ("က", "ကို"), not something to search for. */
const MIN_MYANMAR_KEYWORD = 4
const PLURAL = 'များ'
const SHOP = 'ဆိုင်'

const MYANMAR = /[\u1000-\u109F\uAA60-\uAA7F\uA9E0-\uA9FF]/
const ZERO_WIDTH = /[\u200B-\u200D\uFEFF]/g
const LATIN_ACCENTED = /[\u00C0-\u024F]/
const COMBINING_MARKS = /[\u0300-\u036F]/g
const MYANMAR_DIGIT = /[\u1040-\u1049]/g
const POINT_OUTSIDE_NUMBER = /(?<!\d)\.|\.(?!\d)/g
const NOT_WORD = /[^a-z0-9.\u1000-\u109F\uAA60-\uAA7F\uA9E0-\uA9FF]+/g
const MYANMAR_THEN_LATIN = /([\u1000-\u109F])([a-z0-9])/g
const LATIN_THEN_MYANMAR = /([a-z0-9])([\u1000-\u109F])/g

/**
 * One canonical form for anything compared: lower case, no accents, ASCII
 * digits, punctuation as spaces, and Myanmar marks in their standard order.
 * Keywords and category names go through this too, so both sides agree.
 */
export function canonical(text: string): string {
  let out = text.replace(ZERO_WIDTH, '')
  // "café" -> "cafe". Only when there is an accent: normalize() is not free.
  if (LATIN_ACCENTED.test(out)) out = out.normalize('NFD').replace(COMBINING_MARKS, '')
  return (
    out
      // Some keyboards type the asat before the dot below; Unicode stores it after.
      .replace(/\u103A\u1037/g, '\u1037\u103A')
      // U + II typed as two characters is the single letter UU.
      .replace(/\u1025\u102E/g, '\u1026')
      .toLowerCase()
      .replace(MYANMAR_DIGIT, (digit) => String(digit.charCodeAt(0) - 0x1040))
      // Keep the point in "1.5 km"; every other symbol separates words.
      .replace(POINT_OUTSIDE_NUMBER, ' ')
      .replace(NOT_WORD, ' ')
      // "2km" and "ကော်ဖီcafe" are two words each.
      .replace(MYANMAR_THEN_LATIN, '$1 $2')
      .replace(LATIN_THEN_MYANMAR, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim()
  )
}

/** "Cafes" -> "cafe", "galleries" -> "gallery". Only the last word of a phrase changes. */
function singular(phrase: string): string {
  return phrase.replace(/[a-z]+$/, (word) => {
    if (word.length > 4 && word.endsWith('ies')) return `${word.slice(0, -3)}y`
    if (/(ches|shes|sses|xes)$/.test(word)) return word.slice(0, -2)
    if (word.length > 3 && word.endsWith('s') && !/(ss|us|is)$/.test(word)) return word.slice(0, -1)
    return word
  })
}

type Meaning = { kind: 'near' } | { kind: 'open' } | { kind: 'category'; id: number }

interface Matcher {
  /** Length of the base word, for longest-first ordering. */
  length: number
  /** Exact strings to look for. */
  forms: string[]
  meaning: Meaning
}

/**
 * Myanmar terms match as substrings (no spaces between words). Latin terms
 * match whole words - the text is space-padded with punctuation already turned
 * into spaces, so " cafe " cannot match inside "cafeteria" - optionally plural.
 */
function matcher(term: string, meaning: Meaning, plural: boolean): Matcher {
  if (MYANMAR.test(term)) return { length: term.length, forms: [term], meaning }
  const forms = new Set([term])
  if (plural) {
    forms.add(`${term}s`)
    forms.add(`${term}es`)
    if (term.endsWith('y')) forms.add(`${term.slice(0, -1)}ies`)
  }
  return { length: term.length, forms: [...forms].map((form) => ` ${form} `), meaning }
}

/** Replaces every occurrence with a space. Returns whether there was one. */
function consume(text: { value: string }, { forms }: Matcher): boolean {
  let found = false
  for (const form of forms) {
    // Repeated, because " cafe cafe " shares the space between the two.
    while (text.value.includes(form)) {
      text.value = text.value.replace(form, ' ')
      found = true
    }
  }
  return found
}

let groups: string[][] | undefined
const synonymGroups = () =>
  (groups ??= SYNONYM_GROUPS.map((group) =>
    group.map((word) => {
      const normal = canonical(word)
      return MYANMAR.test(normal) ? normal : singular(normal)
    }),
  ))

/**
 * The words that pick a category: its slug and names in every language, the
 * obvious short forms, and any synonym group one of those belongs to.
 */
export function termsForCategory(category: CategoryTerms): string[] {
  const terms = new Set<string>()

  for (const raw of [category.slug.replace(/[-_]+/g, ' '), ...category.names]) {
    const name = canonical(raw)
    if (!name) continue

    if (!MYANMAR.test(name)) {
      terms.add(singular(name))
      continue
    }

    // "ကော်ဖီဆိုင်များ" (coffee shops) should also match "ကော်ဖီဆိုင်" and "ကော်ဖီ".
    const withoutPlural = name.endsWith(PLURAL) ? name.slice(0, -PLURAL.length).trim() : name
    terms.add(name)
    terms.add(withoutPlural)
    if (withoutPlural.endsWith(SHOP)) {
      const core = withoutPlural.slice(0, -SHOP.length).trim()
      if (core.length >= MIN_MYANMAR_KEYWORD) terms.add(core)
    }
  }

  for (const words of synonymGroups()) {
    if (words.some((word) => terms.has(word))) words.forEach((word) => terms.add(word))
  }

  terms.delete('')
  return [...terms]
}

let fixedMatchers: Matcher[] | undefined
const nearAndOpenMatchers = () =>
  (fixedMatchers ??= [
    ...NEAR_WORDS.map((word) => matcher(canonical(word), { kind: 'near' }, false)),
    ...OPEN_WORDS.map((word) => matcher(canonical(word), { kind: 'open' }, false)),
  ])

let stopPhrases: string[] | undefined
const myanmarStopPhrases = () =>
  (stopPhrases ??= MYANMAR_STOP_PHRASES.map(canonical).sort((a, b) => b.length - a.length))

let built: { key: string; matchers: Matcher[] } | undefined

function buildMatchers(categories: CategoryTerms[]): Matcher[] {
  const key = JSON.stringify(categories)
  if (built?.key === key) return built.matchers

  const matchers = [
    ...nearAndOpenMatchers(),
    ...categories.flatMap((category) =>
      termsForCategory(category).map((term) => matcher(term, { kind: 'category', id: category.id }, true)),
    ),
  ]
  // Longest first: "coffee shop" must win over "shop", "အနီးဆုံး" over "နီး".
  matchers.sort((a, b) => b.length - a.length)
  built = { key, matchers }
  return matchers
}

/** Reads one version of the message. Expects Unicode. */
function read(message: string, matchers: Matcher[]): Intent {
  const text = { value: ` ${canonical(message)} ` }
  const intent: Intent = { categoryId: null, nearMe: false, radiusKm: null, openNow: false, keywords: [] }

  // A distance implies "near me": nobody asks for "within 2 km" of nowhere.
  for (const { pattern, toKm } of DISTANCE_PATTERNS) {
    const found = text.value.match(pattern)
    if (!found?.[1]) continue
    const km = toKm(Number(found[1]))
    if (Number.isFinite(km) && km > 0) {
      intent.radiusKm = Math.min(Math.max(km, 0.1), ASSISTANT_RADIUS_KM_MAX)
      intent.nearMe = true
    }
    text.value = text.value.replace(found[0], ' ')
    break
  }

  for (const m of matchers) {
    if (!consume(text, m)) continue
    if (m.meaning.kind === 'near') intent.nearMe = true
    else if (m.meaning.kind === 'open') intent.openNow = true
    // Only the first (longest) match picks the category, but every category
    // word is still removed so none is left over as a keyword.
    else intent.categoryId ??= m.meaning.id
  }

  for (const phrase of myanmarStopPhrases()) {
    text.value = text.value.split(phrase).join(' ')
  }

  const keywords = new Set<string>()
  for (const token of text.value.split(' ')) {
    if (!token) continue
    const useful = MYANMAR.test(token)
      ? token.length >= MIN_MYANMAR_KEYWORD
      : token.length >= 2 && !STOP_WORDS.has(token) && !/^[\d.]+$/.test(token)
    if (useful) keywords.add(token.slice(0, MAX_KEYWORD_LENGTH))
  }
  intent.keywords = [...keywords].slice(0, MAX_KEYWORDS)

  return intent
}

/** How much of a message was recognised - used to choose between two readings. */
const recognised = (intent: Intent) =>
  (intent.categoryId !== null ? 1 : 0) + (intent.nearMe ? 1 : 0) + (intent.openNow ? 1 : 0)

export function parseMessage(message: string, categories: CategoryTerms[]): Intent {
  const matchers = buildMatchers(categories)

  if (!MYANMAR.test(message)) return read(message, matchers)
  if (looksLikeZawgyi(message)) return read(zawgyiToUnicode(message), matchers)

  // No Zawgyi tell, but short Zawgyi words can be valid Unicode too ("ကဖေး"
  // typed in Zawgyi is a real Unicode sequence). If part of the message went
  // unrecognised, read the converted text as well and keep whichever
  // recognises more. A fully understood message skips the conversion.
  const asTyped = read(message, matchers)
  if (!asTyped.keywords.length) return asTyped
  const converted = zawgyiToUnicode(message)
  if (converted === message) return asTyped
  const asZawgyi = read(converted, matchers)
  return recognised(asZawgyi) > recognised(asTyped) ? asZawgyi : asTyped
}

/** True when nothing in the message was recognised. */
export const isEmptyIntent = (intent: Intent) =>
  intent.categoryId === null && !intent.nearMe && !intent.openNow && intent.keywords.length === 0
