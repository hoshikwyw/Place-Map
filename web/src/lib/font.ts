import { Fraunces, Noto_Sans_Myanmar, Plus_Jakarta_Sans } from 'next/font/google'

/**
 * Plus Jakarta Sans for Latin text (brand.ts `typeface`): a modern geometric
 * sans, clear at a 12px label. It has no Myanmar characters, so Noto Sans
 * Myanmar sits right behind it in the font stack (globals.css) - the browser
 * picks, character by character, the first font that can draw it.
 *
 * Fraunces for headlines (brand.ts `displayTypeface`), through the
 * `font-display` utility: a soft old-style serif, the warm printed-guide voice
 * of the site. Its SOFT axis rounds the terminals; the italic is for the
 * hero's one accented phrase. Myanmar falls through to the same Myanmar sans.
 *
 * All variable fonts, so no weight lists where it can be helped. next/font
 * downloads them at build time and serves them from this site, so the
 * visitor's browser never contacts Google.
 */
const latin = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-latin',
  display: 'swap',
})

const display = Fraunces({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  axes: ['SOFT', 'opsz'],
  variable: '--font-display-latin',
  display: 'swap',
})

const myanmar = Noto_Sans_Myanmar({
  subsets: ['myanmar'],
  weight: ['400', '600', '700'],
  variable: '--font-myanmar',
  display: 'swap',
})

/** Goes on <html>: defines every variable the font stacks in globals.css read. */
export const fontVariables = `${latin.variable} ${display.variable} ${myanmar.variable}`
