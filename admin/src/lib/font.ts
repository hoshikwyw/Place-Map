import { Noto_Sans_Myanmar, Plus_Jakarta_Sans } from 'next/font/google'

/**
 * Plus Jakarta Sans for Latin text (brand.ts `typeface`): a modern geometric
 * sans, tighter and more refined than Poppins at headline sizes and still
 * clear at a 12px label. It has no Myanmar characters, so Noto Sans Myanmar
 * sits right behind it in the font stack (globals.css) - the browser picks,
 * character by character, the first font that can draw it.
 *
 * A variable font, so no weight list: one file draws every weight, where
 * Poppins needed a download per weight.
 *
 * next/font downloads both at build time and serves them from this
 * site, so the visitor's browser never contacts Google.
 */
const latin = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-latin',
  display: 'swap',
})

const myanmar = Noto_Sans_Myanmar({
  subsets: ['myanmar'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-myanmar',
  display: 'swap',
})

/** Goes on <html>: defines both variables the font stack in globals.css reads. */
export const fontVariables = `${latin.variable} ${myanmar.variable}`
