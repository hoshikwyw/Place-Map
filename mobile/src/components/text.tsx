import { StyleSheet, Text as NativeText, type TextProps, type TextStyle } from 'react-native'
import { fonts, useTheme, type FontWeight } from '../theme'

type Tone = 'text' | 'muted' | 'accent' | 'coral' | 'onAccent'

/** Myanmar, Myanmar Extended-A and Myanmar Extended-B. */
const MYANMAR = /[\u1000-\u109F\uAA60-\uAA7F\uA9E0-\uA9FF]/

function containsMyanmar(node: React.ReactNode): boolean {
  if (typeof node === 'string') return MYANMAR.test(node)
  if (Array.isArray(node)) return node.some(containsMyanmar)
  return false
}

/**
 * Myanmar script stacks vowel signs and medials above and below the line. At a
 * line height sized for Latin text those marks are clipped, so any text that
 * contains Myanmar gets at least this multiple of its font size.
 */
const MYANMAR_LINE_HEIGHT = 1.75

/**
 * All text in the app goes through this, so it is always Nunito in a theme
 * colour. React Native has no global default font, and a custom font ignores
 * `fontWeight`, so the weight is chosen here by family rather than left to
 * each screen to get right.
 *
 * Nunito has no Myanmar characters; iOS and Android fall back to their system
 * Myanmar font for those, character by character.
 */
export function Text({
  weight = 'regular',
  tone = 'text',
  style,
  children,
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

  let roomForMyanmar: TextStyle | undefined
  if (containsMyanmar(children)) {
    const flat = StyleSheet.flatten(style) ?? {}
    const minimum = Math.round((flat.fontSize ?? 14) * MYANMAR_LINE_HEIGHT)
    if (!flat.lineHeight || flat.lineHeight < minimum) roomForMyanmar = { lineHeight: minimum }
  }

  return (
    <NativeText {...props} style={[{ fontFamily: fonts[weight], color }, style, roomForMyanmar]}>
      {children}
    </NativeText>
  )
}
