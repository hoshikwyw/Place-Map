/**
 * The brand in one place: every colour, radius and typeface the icons, the
 * website, the admin dashboard and the app share.
 *
 *  - The app imports this directly.
 *  - scripts/src/generate-brand.ts draws the icons from it and writes
 *    web/src/app/brand.css and admin/src/app/brand.css.
 *
 * So one edit here, then `pnpm --filter @place-map/scripts brand`, reaches all
 * four - they cannot drift apart. (The dashboard reads its own `dashboard`
 * palettes below, so it can stay calm and neutral while the public side is
 * warm - but its radii, logo and type are still these.)
 *
 * Deliberately has no imports: the generator loads this file with plain Node,
 * outside any bundler.
 *
 * The direction: warm and local - a friendly guide to the city rather than a
 * tech product. Cream paper and espresso ink, a terracotta accent for anything
 * you can press, saffron and jade as supporting colours (the pin, the twinkle,
 * small highlights), a warm serif for headlines over Plus Jakarta Sans for
 * everything you read. Green and rose stay the two state colours - "open now"
 * and "closed"/delete have to be legible as states, not as brand colour.
 */

export interface Palette {
  /** Page background. */
  canvas: string
  /** Cards, inputs, the header. */
  surface: string
  /**
   * A step above a surface: popovers, the assistant's panel, a hovered row.
   * In light mode the same white as a surface - shadows carry the depth
   * there. In dark mode shadows barely show, so depth is lightness instead:
   * the page is the darkest, a card lighter, anything raised lighter again.
   */
  raised: string
  /** Body text. */
  ink: string
  /** Secondary text. Every muted colour here keeps at least 4.5:1 on canvas. */
  muted: string
  /** Hairline borders. They separate; the shadows in the apps' CSS do the lifting. */
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
  // Cream paper rather than a screen white: the warmth is in the ground, so
  // the photos sit on something rather than floating in a void. Cards are a
  // warm white on it, lifted by a brown-tinted shadow (web globals.css).
  canvas: '#fbf7f0',
  surface: '#fffdf9',
  raised: '#ffffff',
  // Espresso, not black - softer on cream, same weight on the eye.
  ink: '#2a211b',
  // 5.96:1 on canvas, 5.1:1 on the hero's peach end.
  muted: '#6b5d52',
  line: '#ebe1d3',
  // Terracotta. White on it 5.53:1, it on canvas 5.21:1, on accentSoft
  // 4.87:1 - every pair past the 4.5:1 body text needs.
  accent: '#b8410e',
  accentSoft: '#fdeee4',
  onAccent: '#ffffff',
  // Jade: the cool partner to terracotta, for secondary highlights.
  tint: '#0f766e',
  // The ground under a missing photo: warm sand, an empty frame not a colour.
  tintSoft: '#f4ece1',
  // Saffron: small accents only, too light for text.
  highlight: '#f59e0b',
  star: '#d97706',
  success: '#047857',
  successSoft: '#e5f4ec',
  danger: '#be123c',
  dangerSoft: '#fdecef',
  // The hero: warm white at the top melting into peach, like late light.
  bannerFrom: '#fffaf3',
  bannerTo: '#fbe6d4',
}

export const dark: Palette = {
  // Espresso rather than midnight: the dark theme keeps the warmth instead of
  // turning into another product. Depth is lightness - page < card < raised.
  canvas: '#17120e',
  surface: '#211a15',
  raised: '#2b231d',
  ink: '#f6efe6',
  // 8.8:1 on the page, 7.4:1 even on raised.
  muted: '#bfb1a3',
  line: '#3a2f27',
  // A lighter terracotta: 7.5:1 on the page, and dark text on it at the same.
  accent: '#f08a5d',
  accentSoft: '#3a2519',
  onAccent: '#17120e',
  tint: '#4fd1c0',
  tintSoft: '#272019',
  highlight: '#fbbf24',
  star: '#fbbf24',
  success: '#34d399',
  successSoft: '#11291f',
  danger: '#fb7185',
  dangerSoft: '#3b1a1f',
  bannerFrom: '#211a15',
  bannerTo: '#38241a',
}

/**
 * The admin dashboard's own palettes: the calm indigo-on-neutral it had
 * before the public side went warm. A tool people work in all day wants to
 * recede; the warmth is for visitors.
 */
export const dashboardLight: Palette = {
  // Near-white rather than the old lavender wash: a tinted page competes with
  // the photos, which are the content. Cards lift off it with a soft shadow
  // (web globals.css) instead of sitting on colour.
  canvas: '#fafafa',
  surface: '#ffffff',
  raised: '#ffffff',
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

export const dashboardDark: Palette = {
  // Midnight indigo rather than neutral charcoal: the dark theme now carries
  // the logo's colour instead of setting it on grey. Every step is the same
  // hue, so nothing on the page looks borrowed from another product.
  //
  // Depth is lightness here - shadows barely show on a dark ground - so the
  // three grounds climb: page (canvas) < card (surface) < raised.
  canvas: '#0a0b14',
  surface: '#12142a',
  raised: '#1a1d38',
  ink: '#eef0ff',
  // Indigo-grey, not neutral grey: 8.41:1 on the page, 7.05:1 even on raised.
  muted: '#a3a8c9',
  // Hairlines tinted to match, so a border reads as part of the ground.
  line: '#262a4a',
  // Brighter than the light theme's #4f46e5, which is too dim to read on
  // midnight. 7.20:1 on the page; dark text on it at 7.20:1.
  accent: '#8b93ff',
  accentSoft: '#20244a',
  onAccent: '#0a0b14',
  tint: '#6ea8ff',
  tintSoft: '#181b33',
  highlight: '#67e8f9',
  star: '#fbbf24',
  success: '#34d399',
  successSoft: '#0d2a2a',
  danger: '#fb7185',
  dangerSoft: '#3a1530',
  // The hero: card at the top, a violet glow at the bottom.
  bannerFrom: '#12142a',
  bannerTo: '#1c1a45',
}

export const logoColors = {
  /** Saffron at the crown to terracotta at the tip - a sunlit clay pin. */
  gradientFrom: '#f6a623',
  gradientTo: '#d2481a',
  shadow: '#e8b89a',
  /** The mascot's eyes and smile: deep espresso rather than black, softer on the gradient. */
  face: '#3b1d10',
  /** Rosy cheeks. */
  cheek: '#ff8f8f',
  /** The gloss on the head and the catch-light in each eye. */
  shine: '#ffffff',
  /** The little twinkle beside the head: jade, the cool note against the warm pin. */
  sparkle: '#14b8a6',
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
 * Soft corners: the warm direction wants things to feel handled rather than
 * machined. Buttons sit at `md`, photos and cards at `lg`, the hero at `xl`;
 * chips stay pills.
 */
export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 9999,
} as const

/**
 * Every surface: the website and the dashboard load it through next/font (one
 * variable file), the app through @expo-google-fonts (a static file per
 * weight - see mobile/app/_layout.tsx). Tighter and more refined than Poppins,
 * which it replaced, at headline sizes.
 */
export const typeface = 'Plus Jakarta Sans'

/**
 * Headlines: Fraunces, a soft old-style serif - the warm, printed-guidebook
 * voice next to the sans. Only for headline-sized text; everything read at
 * body size stays Plus Jakarta Sans. It has no Myanmar characters, so Myanmar
 * headlines fall through to the Myanmar sans as before.
 */
export const displayTypeface = 'Fraunces'
