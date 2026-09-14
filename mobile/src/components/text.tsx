import { Text as NativeText, type TextProps } from 'react-native'
import { fonts, useTheme, type FontWeight } from '../theme'

type Tone = 'text' | 'muted' | 'accent' | 'coral' | 'onAccent'

/**
 * All text in the app goes through this, so it is always Nunito in a theme
 * colour. React Native has no global default font, and a custom font ignores
 * `fontWeight`, so the weight is chosen here by family rather than left to
 * each screen to get right.
 */
export function Text({
  weight = 'regular',
  tone = 'text',
  style,
  ...props
}: TextProps & { weight?: FontWeight; tone?: Tone }) {
  const theme = useTheme()
  const color = {
    text: theme.text,
    muted: theme.muted,
    accent: theme.accent,
    coral: theme.coralStrong,
    onAccent: theme.onAccent,
  }[tone]

  return <NativeText {...props} style={[{ fontFamily: fonts[weight], color }, style]} />
}
