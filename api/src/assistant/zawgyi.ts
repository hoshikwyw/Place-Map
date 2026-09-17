import Rabbit from 'rabbit-node'

/**
 * Zawgyi is the pre-standard Myanmar encoding many phones still type in. It
 * reuses the Unicode Myanmar block with different meanings and a different
 * character order, so "ကော်ဖီ" typed in Zawgyi never equals the Unicode keyword
 * even though both look identical on the phone that typed them.
 *
 * Detection looks for sequences valid Unicode Burmese cannot contain. Longer
 * text almost always has one. Many words are identical in both encodings
 * ("အနီး") and need none; the few short Zawgyi words that are also valid
 * Unicode are handled by the parser, which reads such text both ways.
 */
const ZAWGYI_TELLS = [
  // The E vowel sign is typed before its consonant in Zawgyi; in Unicode it
  // always follows a consonant or medial.
  /(?:^|[^\u1000-\u1021\u103B-\u103E\u1050-\u1055])\u1031/,
  // Zawgyi's asat is U+1039, which in Unicode is the stacking virama and must
  // be followed by the consonant it stacks.
  /\u1039(?![\u1000-\u1021])/,
  // Pre-composed stacked consonants and vowel variants. Unicode assigns these
  // code points to Mon, Shan and Karen, never to Burmese.
  /[\u1033\u1034\u105A\u1060-\u1097]/,
]

export function looksLikeZawgyi(text: string): boolean {
  return ZAWGYI_TELLS.some((tell) => tell.test(text))
}

export const zawgyiToUnicode = (text: string): string => Rabbit.zg2uni(text)

/** Unicode in, Unicode out; Zawgyi in, converted. */
export function toUnicode(text: string): string {
  return looksLikeZawgyi(text) ? zawgyiToUnicode(text) : text
}
