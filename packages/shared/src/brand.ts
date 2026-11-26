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
 * The direction: the brand sheet's violet-to-blue gradient pin, on a clean,
 * near-neutral ground - white and charcoal rather than tinted lavender and
 * navy - with Plus Jakarta Sans. Indigo carries
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
  /** The rating star. Amber reads as a star everywhere; the brand has no yellow. */
  star: string
  /** "Open now". */
  success: string
  successSoft: string
  /** "Closed now", delete, anything destructive. */
  danger: string
  dangerSoft: string
  /**
   * The home banner's two ends.
   *
   * Pale on purpose. The brand sheet's banner is dark text on a light
   * lavender wash, not white on violet - white on the logo's own
   * `gradientFrom` is 3.84:1, which is under the 4.5:1 that body text needs.
   * Keeping the panel light lets the page's own ink and muted colours sit on
   * it, so the banner cannot drift out of contrast when the palette moves.
   */
  bannerFrom: string
  bannerTo: string
}

export const light: Palette = {
  // Near-white rather than the old lavender wash: a tinted page competes with
  // the photos, which are the content. Cards lift off it with a soft shadow
  // (web globals.css) instead of sitting on colour.
  canvas: '#fafafa',
  surface: '#ffffff',
  ink: '#0c0c14',
  muted: '#5b5e6e',
  // Quieter hairlines: with shadows doing the lifting, a border only has to
  // separate, not outline.
  line: '#e8e8ee',
  // A deeper indigo than the brand sheet's #6366f1, still in the logo's
  // family. Every pair measured: white on it 6.29:1, it on canvas 6.02:1, on
  // accentSoft 5.55:1 - all past the 4.5:1 body text needs, with room to
  // spare where the old #595ce4 sat at 4.55.
  accent: '#4f46e5',
  accentSoft: '#eef0ff',
  onAccent: '#ffffff',
  tint: '#3b82f6',
  // Neutral, not blue: the ground under a missing photo should read as an
  // empty frame, not as a colour.
  tintSoft: '#f2f3f8',
  highlight: '#22d3ee',
  star: '#d97706',
  success: '#047857',
  successSoft: '#e7f8f0',
  danger: '#be123c',
  dangerSoft: '#fff0f2',
  // The hero is a white panel with the faintest violet at one end - premium
  // reads as restraint, and the old saturated wash was the loudest thing on
  // the page.
  bannerFrom: '#ffffff',
  bannerTo: '#f1f0ff',
}

export const dark: Palette = {
  // Charcoal rather than navy: a neutral dark lets the indigo be the only
  // colour, which is most of what made the light theme feel calmer.
  canvas: '#0b0b10',
  surface: '#15151d',
  ink: '#f4f4f7',
  muted: '#9c9eae',
  line: '#272731',
  // Lighter than the light theme's: #4f46e5 on charcoal is too dim to read.
  // 7.11:1 on canvas, and dark text on it at 7.11:1.
  accent: '#8f90ff',
  accentSoft: '#1f1f3d',
  onAccent: '#0b0b10',
  tint: '#60a5fa',
  tintSoft: '#1b1b25',
  highlight: '#67e8f9',
  star: '#fbbf24',
  success: '#34d399',
  successSoft: '#0c2a22',
  danger: '#fb7185',
  dangerSoft: '#3a1420',
  bannerFrom: '#15151d',
  bannerTo: '#191934',
}

export const logoColors = {
  gradientFrom: '#a35df0',
  gradientTo: '#3b82f6',
  shadow: '#81aff9',
  /** The mascot's eyes and smile: deep indigo rather than black, softer on the gradient. */
  face: '#1e1b4b',
  /** Rosy cheeks. */
  cheek: '#ff9ccf',
  /** The gloss on the head and the catch-light in each eye. */
  shine: '#ffffff',
  /** The little twinkle beside the head: the brand's cyan. */
  sparkle: '#22d3ee',
} as const

/**
 * Icon backgrounds: white for the public site and app, as on the brand sheet's
 * app icon; navy for the admin tab, so the two are distinguishable at a glance.
 */
export const iconGround = {
  public: '#ffffff',
  admin: '#0f172a',
} as const

/**
 * Rounded, but a step tighter than before: very soft corners on every surface
 * read as playful, and a little more edge reads as considered. Buttons and
 * chips stay pills.
 */
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 9999,
} as const

/**
 * The web and the dashboard. Tighter and more refined than Poppins at headline
 * sizes, and a variable font, so every weight is one file. The app still loads
 * Poppins (mobile/app/_layout.tsx) until it is moved over - a native font
 * package, so its own change.
 */
export const typeface = 'Plus Jakarta Sans'
