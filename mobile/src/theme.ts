import { useColorScheme } from 'react-native'
import { dark, light, radius as brandRadius, type Palette } from '@place-map/shared'

/**
 * The app's colours, radii and fonts - all from packages/shared/src/brand.ts,
 * the same tokens as the website, the admin dashboard and the icons. Nothing
 * here is a colour of its own: change the brand there and the app follows.
 *
 * Follows the phone's light/dark setting (app.json: userInterfaceStyle
 * "automatic").
 */

export interface Theme {
  background: string
  surface: string
  text: string
  muted: string
  border: string
  accent: string
  accentSoft: string
  onAccent: string
  tint: string
  tintSoft: string
  highlight: string
  star: string
  open: string
  openSoft: string
  closed: string
  closedSoft: string
  /** The home welcome banner's warm wash. */
  banner: string
}

function fromPalette(p: Palette): Theme {
  return {
    background: p.canvas,
    surface: p.surface,
    text: p.ink,
    muted: p.muted,
    border: p.line,
    accent: p.accent,
    accentSoft: p.accentSoft,
    onAccent: p.onAccent,
    tint: p.tint,
    tintSoft: p.tintSoft,
    highlight: p.highlight,
    star: p.star,
    // States, not brand colour: green reads as open, rose as closed.
    open: p.success,
    openSoft: p.successSoft,
    closed: p.danger,
    closedSoft: p.dangerSoft,
    banner: p.bannerTo,
  }
}

const LIGHT = fromPalette(light)
const DARK = fromPalette(dark)

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? DARK : LIGHT
}

export const radius = brandRadius

/**
 * A soft, warm lift for cards - the website's brown-tinted shadow. In dark
 * mode the elevation barely shows, which is fine: there the surfaces climb in
 * lightness instead.
 */
export const cardShadow = {
  shadowColor: '#422814',
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const

/**
 * Plus Jakarta Sans and the Fraunces headline face, loaded in app/_layout.tsx. Custom fonts in React Native ignore
 * `fontWeight` - each weight is its own family - so text picks a family, never
 * a weight. src/components/text.tsx does that for every screen.
 */
export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  semibold: 'PlusJakartaSans_600SemiBold',
  medium: 'PlusJakartaSans_500Medium',
  bold: 'PlusJakartaSans_700Bold',
  /**
   * Fraunces, the headline serif (brand.ts `displayTypeface`) - for titles
   * only, as on the website. No Myanmar characters: the system Myanmar font
   * draws those, as it does under Plus Jakarta Sans.
   */
  display: 'Fraunces_600SemiBold',
} as const

export type FontWeight = keyof typeof fonts
