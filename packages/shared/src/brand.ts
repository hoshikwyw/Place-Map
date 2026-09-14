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
 * The direction is minimalist and cute, taken from the mascot: warm cream
 * instead of cold grey, teal for anything you can press (it passes contrast
 * with white text, which coral does not at button sizes), and coral - the
 * mascot's own colour - as the soft, friendly accent.
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
  /** Buttons, links, focus rings, "open now". */
  accent: string
  /** Tinted backgrounds behind accent content: hover, selected, chips. */
  accentSoft: string
  /** Text on an accent fill. */
  onAccent: string
  /** The mascot's coral: decoration only, too light for text. */
  coral: string
  /** Tinted backgrounds behind coral content. */
  coralSoft: string
  /** Coral dark enough to be text: "closed now", destructive actions. */
  coralStrong: string
  /** The Archer's arrow: small highlights. */
  gold: string
}

export const light: Palette = {
  canvas: '#fff9f3',
  surface: '#ffffff',
  ink: '#2e2723',
  muted: '#7b6f68',
  line: '#f1e6dc',
  accent: '#0f766e',
  accentSoft: '#e3f3ef',
  onAccent: '#ffffff',
  coral: '#ff6b57',
  coralSoft: '#ffece7',
  coralStrong: '#c2412d',
  gold: '#f59e0b',
}

export const dark: Palette = {
  canvas: '#171513',
  surface: '#211e1b',
  ink: '#f5efe9',
  muted: '#b3a8a0',
  line: '#332e2a',
  accent: '#5eead4',
  accentSoft: '#15302c',
  onAccent: '#0b2622',
  coral: '#ff8a78',
  coralSoft: '#3a221d',
  coralStrong: '#ff9d8c',
  gold: '#fcd34d',
}

/** The mascot's own colours - fixed, so the character is the same on any theme. */
export const mascotColors = {
  body: '#ff6b57',
  outline: '#0b4f4a',
  eyes: '#2e2723',
  arrow: '#fbbf24',
  flame: '#f59e0b',
  flameLight: '#fcd34d',
  blush: '#ffc9bf',
  tongue: '#ff9d90',
} as const

/** Icon backgrounds: teal for the public site and app, warm ink for the admin tab. */
export const iconGround = {
  public: '#0f766e',
  admin: '#2e2723',
} as const

/** Generous rounding is most of what makes an interface read as friendly. */
export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 9999,
} as const

/** A rounded typeface, on every surface. */
export const typeface = 'Nunito'
