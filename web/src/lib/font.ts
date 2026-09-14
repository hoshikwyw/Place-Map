import { Nunito } from 'next/font/google'

/**
 * Nunito: rounded terminals, which carry most of the brand's friendliness, and
 * very readable at small sizes. The same face as the admin dashboard and app.
 *
 * next/font downloads it at build time and serves it from this site, so a
 * visitor's browser never contacts Google, and there is no layout shift while
 * it loads. Latin Extended covers Uzbek's o‘ and g‘.
 */
export const nunito = Nunito({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-nunito',
  display: 'swap',
})
