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
  open: string
  openSoft: string
  closed: string
  closedSoft: string
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
    // States, not brand colour: green reads as open, rose as closed.
    open: p.success,
    openSoft: p.successSoft,
    closed: p.danger,
    closedSoft: p.dangerSoft,
  }
}

const LIGHT = fromPalette(light)
const DARK = fromPalette(dark)

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? DARK : LIGHT
}

export const radius = brandRadius

/**
 * Poppins, loaded in app/_layout.tsx. Custom fonts in React Native ignore
 * `fontWeight` - each weight is its own family - so text picks a family, never
 * a weight. src/components/text.tsx does that for every screen.
 */
export const fonts = {
  regular: 'Poppins_400Regular',
  semibold: 'Poppins_600SemiBold',
  medium: 'Poppins_500Medium',
  bold: 'Poppins_700Bold',
} as const

export type FontWeight = keyof typeof fonts
