import { Nunito } from 'next/font/google'

/**
 * Nunito, the same rounded face as the public site and the app. next/font
 * downloads it at build time and serves it from this dashboard, so the
 * operator's browser never contacts Google. Latin Extended covers Uzbek's o‘
 * and g‘, which get typed into these forms.
 */
export const nunito = Nunito({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-nunito',
  display: 'swap',
})
