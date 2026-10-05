import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import sharp from 'sharp'
import {
  dark,
  iconGround,
  light,
  mascotColors as M,
  radius,
  type Palette,
} from '../../packages/shared/src/brand.ts'

/**
 * Renders the brand from packages/shared/src/brand.ts into every app:
 *
 *   pnpm --filter @place-map/scripts brand
 *
 *  - favicons and app icons, drawn with the mascot
 *  - web/src/app/brand.css and admin/src/app/brand.css - the colour and radius
 *    tokens as CSS variables, light and dark
 *  - the mascot on its own, for empty states, errors and the login screen
 *
 * Edit the tokens, run this once, and the icons, website, dashboard and app all
 * change together. Outputs are committed, so no app needs sharp to build.
 */

const root = resolve(import.meta.dirname, '..', '..')
const WHITE = '#ffffff'

// ------------------------------------------------------------------- mascot
//
// A map pin with a Sagittarius personality, drawn in a 100-unit box:
//
//  - the body is the brand's pin: round-headed, coral, with a short tip
//  - big bright eyes, rosy cheeks and a soft smile: the sign's optimism
//  - the Archer's golden dart, small and clear of the face, flying up-right
//    like the ♐ glyph - "let's go and find somewhere"
//
// Kept to those elements on purpose: the theme is minimalist, and every extra
// detail is noise at icon sizes. Two earlier details are deliberately gone - a
// flame tuft on the head and a full-length arrow crossing the icon - because
// together they read as a carrot with leaves rather than a map pin.

/** Round-headed pin: head circle centred (50,44) r28, tip at (50,89). */
const BODY = 'M50 89 C44 81 22 65 22 44 A28 28 0 1 1 78 44 C78 65 56 81 50 89 Z'

/** A compact dart up by the pin's shoulder, angled along y = 100 - x. */
const DART_SHAFT = 'M72 30 L84 18'
const DART_HEAD = 'M88 14 L80.5 29 L73 21.5 Z'
const DART_FLETCHING = 'M74 28 L68 28 M74 28 L74 34'

const EYES = [
  { cx: 40.5, cy: 43 },
  { cx: 59.5, cy: 43 },
]
/** An open curve, not a filled mouth: it stays a smile when the icon is tiny. */
const SMILE = 'M43.5 50.5 Q50 57.5 56.5 50.5'

/** The full character, for every surface big enough to show it. */
function mascot(): string {
  return [
    // The dart first: behind the body, so the head overlaps its fletching.
    `<path d="${DART_SHAFT}" stroke="${M.arrow}" stroke-width="4.5" stroke-linecap="round"/>`,
    `<path d="${DART_HEAD}" fill="${M.arrow}" stroke="${M.arrow}" stroke-width="2" stroke-linejoin="round"/>`,
    `<path d="${DART_FLETCHING}" stroke="${M.fletching}" stroke-width="3" stroke-linecap="round" fill="none"/>`,
    `<path d="${BODY}" fill="${M.body}" stroke="${M.outline}" stroke-width="3" stroke-linejoin="round"/>`,
    `<ellipse cx="32.5" cy="52.5" rx="4.6" ry="2.9" fill="${M.blush}" opacity="0.85"/>`,
    `<ellipse cx="67.5" cy="52.5" rx="4.6" ry="2.9" fill="${M.blush}" opacity="0.85"/>`,
    ...EYES.map(({ cx, cy }) => `<ellipse cx="${cx}" cy="${cy}" rx="4.6" ry="5.6" fill="${M.eyes}"/>`),
    // Catchlights: the single detail that makes a face read as alive.
    ...EYES.map(({ cx, cy }) => `<circle cx="${cx + 1.6}" cy="${cy - 2.3}" r="1.7" fill="${WHITE}"/>`),
    `<path d="${SMILE}" fill="none" stroke="${M.eyes}" stroke-width="2.6" stroke-linecap="round"/>`,
  ].join('')
}

/**
 * At 16 px the dart, smile and cheeks turn into noise, so the smallest tab size
 * keeps only what survives: the pin and two large eyes. Still recognisably the
 * same character.
 */
function mascotMini(): string {
  return [
    `<path d="${BODY}" fill="${M.body}"/>`,
    `<ellipse cx="40" cy="44" rx="5.6" ry="7" fill="${M.eyes}"/>`,
    `<ellipse cx="60" cy="44" rx="5.6" ry="7" fill="${M.eyes}"/>`,
  ].join('')
}

/**
 * The whole character as one flat silhouette, for Android's themed icons: the
 * system recolours this layer, so the face is cut out as transparency rather
 * than drawn in another colour.
 */
function mascotSilhouette(id: string): string {
  return (
    `<defs><mask id="${id}">` +
    `<path d="${DART_SHAFT}" stroke="white" stroke-width="4.5" stroke-linecap="round"/>` +
    `<path d="${DART_FLETCHING}" stroke="white" stroke-width="3" stroke-linecap="round" fill="none"/>` +
    `<path d="${DART_HEAD}" fill="white" stroke="white" stroke-width="2" stroke-linejoin="round"/>` +
    `<path d="${BODY}" fill="white"/>` +
    EYES.map(({ cx, cy }) => `<ellipse cx="${cx}" cy="${cy}" rx="4.6" ry="5.6" fill="black"/>`).join('') +
    `<path d="${SMILE}" fill="none" stroke="black" stroke-width="2.6" stroke-linecap="round"/>` +
    `</mask></defs>` +
    `<rect width="100" height="100" fill="${WHITE}" mask="url(#${id})"/>`
  )
}

// ------------------------------------------------------------- compositions

const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`

/** Scales artwork about the centre of the box, so every size stays centred. */
const scaled = (art: string, scale: number) =>
  `<g transform="translate(50 50) scale(${scale}) translate(-50 -50)">${art}</g>`

/**
 * Browser tab icon: rounded square. The arrow reaches into the corners, so the
 * art is clipped to the square - otherwise the arrowhead would poke out past
 * the rounded corner.
 */
const tabIcon = (background: string, art: string, scale: number) =>
  svg(
    `<defs><clipPath id="tab"><rect width="100" height="100" rx="22"/></clipPath></defs>` +
      `<g clip-path="url(#tab)"><rect width="100" height="100" fill="${background}"/>${scaled(art, scale)}</g>`,
  )

/**
 * Full-bleed square for iOS, Android's legacy icon and the App Store. No
 * rounded corners and no transparency: the OS applies its own mask, and a
 * transparent corner renders black on iOS.
 */
const fullBleed = (background: string, art: string, scale: number) =>
  svg(`<rect width="100" height="100" fill="${background}"/>${scaled(art, scale)}`)

/**
 * Android adaptive foreground: transparent, artwork inside the centre safe
 * zone. Launchers crop this layer to a circle, squircle or square, and only a
 * circle of about 61% diameter survives all of them - the arrow's tips included.
 * Measured at 28.9% of the canvas from centre, against a 30.5% limit.
 */
const ADAPTIVE_SCALE = 0.5

// ---------------------------------------------------------------- CSS tokens

const kebab = (key: string) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)

function declarations(palette: Palette, indent: string): string {
  const colours = Object.entries(palette).map(([key, value]) => `${indent}--color-${kebab(key)}: ${value};`)
  // Aliases the dashboard already uses, so its components need no renaming.
  colours.push(`${indent}--color-danger: ${palette.coralStrong};`)
  colours.push(`${indent}--color-open: ${palette.accent};`)
  colours.push(`${indent}--color-closed: ${palette.coralStrong};`)
  return colours.join('\n')
}

/**
 * Plain :root variables with a dark override - not Tailwind's @theme, which
 * does not support being nested inside a media query. That nesting was why dark
 * mode never actually applied before.
 */
function brandCss(): string {
  const radii = Object.entries(radius)
    .map(([key, value]) => `  --brand-radius-${key}: ${value}px;`)
    .join('\n')

  return `/*
 * Generated by scripts/src/generate-brand.ts from packages/shared/src/brand.ts.
 * Edit the tokens there and run \`pnpm --filter @place-map/scripts brand\` -
 * changes made here are overwritten.
 */

:root {
  color-scheme: light dark;
${declarations(light, '  ')}
${radii}
}

@media (prefers-color-scheme: dark) {
  :root {
${declarations(dark, '    ')}
  }
}
`
}

// -------------------------------------------------------------------- output

const png = (source: string, size: number) =>
  sharp(Buffer.from(source), { density: Math.max(72, size) })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer()

/**
 * Builds a .ico holding PNG images. sharp cannot write ICO, but the format is a
 * small index in front of the PNGs, and every browser since IE Vista reads
 * PNG-in-ICO. Each size gets its own drawing, so the 16 px one can be simpler.
 */
async function ico(entries: { size: number; source: string }[]): Promise<Buffer> {
  const images = await Promise.all(entries.map(({ size, source }) => png(source, size)))

  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(images.length, 4)

  const directory = Buffer.alloc(16 * images.length)
  let offset = header.length + directory.length

  images.forEach((image, i) => {
    const size = entries[i]!.size
    const at = i * 16
    directory.writeUInt8(size >= 256 ? 0 : size, at) // 0 means 256
    directory.writeUInt8(size >= 256 ? 0 : size, at + 1)
    directory.writeUInt8(0, at + 2) // no palette
    directory.writeUInt8(0, at + 3) // reserved
    directory.writeUInt16LE(1, at + 4) // colour planes
    directory.writeUInt16LE(32, at + 6) // bits per pixel
    directory.writeUInt32LE(image.length, at + 8)
    directory.writeUInt32LE(offset, at + 12)
    offset += image.length
  })

  return Buffer.concat([header, directory, ...images])
}

async function write(relativePath: string, data: Buffer | string) {
  const path = join(root, relativePath)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, data)
  const bytes = typeof data === 'string' ? Buffer.byteLength(data) : data.length
  console.log(`  ${relativePath.padEnd(46)} ${(bytes / 1024).toFixed(1)} KB`)
}

/**
 * The Next.js file conventions - app/icon.svg, favicon.ico, apple-icon.png -
 * plus the tokens and a standalone mascot for the app's own pages.
 */
async function nextApp(app: 'web' | 'admin', ground: string) {
  const full = tabIcon(ground, mascot(), 0.95)
  const mini = tabIcon(ground, mascotMini(), 1)

  await write(`${app}/src/app/icon.svg`, full)
  await write(
    `${app}/src/app/favicon.ico`,
    await ico([
      { size: 16, source: mini },
      { size: 32, source: full },
      { size: 48, source: full },
    ]),
  )
  await write(`${app}/src/app/apple-icon.png`, await png(fullBleed(ground, mascot(), 0.9), 180))
  await write(`${app}/src/app/brand.css`, brandCss())
  // Served from public/, so pages use it as a plain <img> with no bundling.
  await write(`${app}/public/mascot.svg`, svg(mascot()))
}

async function main() {
  console.log('website')
  await nextApp('web', iconGround.public)

  console.log('admin - on warm ink, so its tab is distinguishable')
  await nextApp('admin', iconGround.admin)

  // Sizes match the Expo SDK 57 template these replace.
  console.log('mobile')
  await write('mobile/assets/icon.png', await png(fullBleed(iconGround.public, mascot(), 0.9), 1024))
  await write('mobile/assets/android-icon-foreground.png', await png(svg(scaled(mascot(), ADAPTIVE_SCALE)), 512))
  await write(
    'mobile/assets/android-icon-background.png',
    await png(svg(`<rect width="100" height="100" fill="${iconGround.public}"/>`), 512),
  )
  await write(
    'mobile/assets/android-icon-monochrome.png',
    await png(svg(scaled(mascotSilhouette('mono'), ADAPTIVE_SCALE)), 432),
  )
  await write('mobile/assets/favicon.png', await png(tabIcon(iconGround.public, mascot(), 0.95), 48))
  await write('mobile/assets/splash-icon.png', await png(svg(scaled(mascot(), 0.62)), 1024))
  // For the app's own screens: home header, empty and error states.
  await write('mobile/assets/mascot.png', await png(svg(mascot()), 512))
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
