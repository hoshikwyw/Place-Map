import { Noto_Sans_Myanmar, Nunito } from 'next/font/google'

/**
 * Nunito for Latin text: rounded terminals carry most of the brand's
 * friendliness, and it matches the public site and the app. It has no
 * Myanmar characters, so Noto Sans Myanmar sits right behind it in the font
 * stack (globals.css) - the browser picks, character by character, the first
 * font that can draw it.
 *
 * next/font downloads both at build time and serves them from this
 * dashboard, so the operator's browser never contacts Google.
 */
const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-nunito',
  display: 'swap',
})

const myanmar = Noto_Sans_Myanmar({
  subsets: ['myanmar'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-myanmar',
  display: 'swap',
})

/** Goes on <html>: defines both variables the font stack in globals.css reads. */
export const fontVariables = `${nunito.variable} ${myanmar.variable}`
