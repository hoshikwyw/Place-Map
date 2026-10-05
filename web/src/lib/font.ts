import { Noto_Sans_Myanmar, Poppins } from 'next/font/google'

/**
 * Poppins for Latin text, as on the brand sheet: geometric, even-width letters
 * that stay legible from a 12px label to the hero. It has no Myanmar
 * characters, so Noto Sans Myanmar sits right behind it in the font stack
 * (globals.css) - the browser picks, character by character, the first font
 * that can draw it.
 *
 * Poppins has no variable build on Google Fonts, so every weight is its own
 * file: these four are the ones the interface uses, and loading more would cost
 * a download each.
 *
 * next/font downloads both at build time and serves them from this
 * site, so the visitor's browser never contacts Google.
 */
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
})

const myanmar = Noto_Sans_Myanmar({
  subsets: ['myanmar'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-myanmar',
  display: 'swap',
})

/** Goes on <html>: defines both variables the font stack in globals.css reads. */
export const fontVariables = `${poppins.variable} ${myanmar.variable}`
