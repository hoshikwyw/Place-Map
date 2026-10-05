/**
 * The brand in one place: every colour, radius and typeface the icons, the
 * website, the admin dashboard and the app share.
 *
 *  - The app imports this directly.
 *  - scripts/src/generate-brand.ts draws the icons from it and writes
 *    web/src/app/brand.css and admin/src/app/brand.css.
 *
 * So one edit here, then `pnpm --filter @place-map/scripts brand`, reaches all
 * four - they cannot drift apart.
 *
 * Deliberately has no imports: the generator loads this file with plain Node,
 * outside any bundler.
 *
 * The direction comes from the Place-Map brand sheet: a violet-to-blue gradient
 * pin, Poppins, cool neutrals, and a deep navy for dark mode. Indigo carries
 * anything you can press; blue and cyan are supporting tints. Green and rose
 * are the two colours the sheet does not provide and the product needs - "open
 * now" and "closed"/delete have to be legible as states, not as brand colour.
 */

export interface Palette {
  /** Page background. */
  canvas: string
  /** Cards, inputs, the header. */
  surface: string
  /** Body text. */
  ink: string
  /** Secondary text. Every muted colour here keeps at least 4.5:1 on canvas. */
  muted: string
  /** Hairline borders - the only separator; no shadows. */
  line: string
  /** Buttons, links, focus rings, the active tab. */
  accent: string
  /** Tinted backgrounds behind accent content: hover, selected, chips. */
  accentSoft: string
  /** Text on an accent fill. */
  onAccent: string
  /** The brand's blue: secondary highlights, the logo's lower half. */
  tint: string
  /** Tinted backgrounds: image placeholders, category bubbles. */
  tintSoft: string
  /** The brand's cyan: small accents only, too light for text. */
  highlight: string
  /** "Open now". */
  success: string
  successSoft: string
  /** "Closed now", delete, anything destructive. */
  danger: string
  dangerSoft: string
}

export const light: Palette = {
  canvas: '#f3f4ff',
  surface: '#ffffff',
  ink: '#0f172a',
  muted: '#5b6478',
  line: '#e5e7eb',
  // The sheet's #6366f1, nudged two steps darker: white text on the original
  // sits at 4.47:1, just under the 4.5:1 minimum, and buttons use white text.
  accent: '#5d60ee',
  accentSoft: '#eef0ff',
  onAccent: '#ffffff',
  tint: '#3b82f6',
  tintSoft: '#e8eeff',
  highlight: '#22d3ee',
  success: '#047857',
  successSoft: '#d1fae5',
  danger: '#be123c',
  dangerSoft: '#ffe4e6',
}

export const dark: Palette = {
  canvas: '#0f172a',
  surface: '#1b2538',
  ink: '#f1f5f9',
  muted: '#94a3b8',
  line: '#273449',
  // Lighter than the light theme's indigo: #6366f1 on navy is too dim to read.
  accent: '#818cf8',
  accentSoft: '#232b4d',
  onAccent: '#0f172a',
  tint: '#60a5fa',
  tintSoft: '#1e2a44',
  highlight: '#67e8f9',
  success: '#34d399',
  successSoft: '#0b3b32',
  danger: '#fb7185',
  dangerSoft: '#4c1525',
}

/**
 * The logo's own colours - fixed, so the mark is identical on any theme and on
 * any background. Sampled from the brand sheet: violet at the top of the pin,
 * blue at the tip, with a soft blue shadow beneath it.
 */
export const logoColors = {
  gradientFrom: '#a35df0',
  gradientTo: '#3b82f6',
  shadow: '#81aff9',
} as const

/**
 * Icon backgrounds: white for the public site and app, as on the brand sheet's
 * app icon; navy for the admin tab, so the two are distinguishable at a glance.
 */
export const iconGround = {
  public: '#ffffff',
  admin: '#0f172a',
} as const

/** Generous rounding is most of what makes an interface read as friendly. */
export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 9999,
} as const

/** A geometric sans, on every surface. */
export const typeface = 'Poppins'
