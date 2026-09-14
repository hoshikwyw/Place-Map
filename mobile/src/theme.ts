import { useColorScheme } from 'react-native'

/**
 * Plain StyleSheet with a small palette, rather than NativeWind. NativeWind
 * needs Babel, Metro and Tailwind configuration of its own, and those layers
 * are the usual reason an Expo build breaks after an upgrade; a dozen colours
 * do not justify them.
 *
 * Follows the phone's light/dark setting (app.json: userInterfaceStyle
 * "automatic").
 */

const light = {
  background: '#ffffff',
  surface: '#f5f7f9',
  text: '#101418',
  muted: '#5d6b7a',
  border: '#dfe4ea',
  accent: '#1f6feb',
  onAccent: '#ffffff',
  open: '#1a7f37',
  closed: '#b42318',
}

export type Theme = typeof light

const dark: Theme = {
  background: '#0c1017',
  surface: '#151b24',
  text: '#e7edf3',
  muted: '#93a1b1',
  border: '#263040',
  accent: '#4c9aff',
  onAccent: '#0c1017',
  open: '#3fb950',
  closed: '#ff6b5e',
}

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light
}
