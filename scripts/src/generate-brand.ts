import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import sharp from 'sharp'
import {
  dark,
  iconGround,
  light,
  logoColors as L,
  radius,
  type Palette,
} from '../../packages/shared/src/brand.ts'

/**
 * Renders the brand from packages/shared/src/brand.ts into every app:
 *
 *   pnpm --filter @place-map/scripts brand
 *
 *  - favicons and app icons, drawn with the logo
 *  - web/src/app/brand.css and admin/src/app/brand.css - the colour and radius
 *    tokens as CSS variables, light and dark
 *  - the logo on its own, for the header, empty states and the login screen
 *
 * Edit the tokens, run this once, and the icons, website, dashboard and app all
 * change together. Outputs are committed, so no app needs sharp to build.
 */

const root = resolve(import.meta.dirname, '..', '..')
const WHITE = '#ffffff'

// --------------------------------------------------------------------- logo
//
// The brand sheet's mark, drawn in a 100-unit box: a map pin filled with the
// violet-to-blue gradient, its centre cut clean through, over a soft shadow.
//
// The cut-out is a second subpath with fill-rule="evenodd" rather than a circle
// painted in the background colour, so the hole is genuinely transparent - the
// same file then works on white, on navy and over a photo.

/** Pin: head circle centred (50,38) r26, drawn down to a point at (50,93). */
const PIN_BODY = 'M50 93 C46 84 24 58 24 38 A26 26 0 1 1 76 38 C76 58 54 84 50 93 Z'
/** The hole, as a subpath: two arcs, so evenodd cuts it out of the body. */
const PIN_HOLE = 'M59.5 38 A9.5 9.5 0 1 0 40.5 38 A9.5 9.5 0 1 0 59.5 38 Z'

const GRADIENT_ID = 'brand'

/** The gradient runs top-left to bottom-right, as on the sheet. */
const gradient = (id: string) =>
  `<defs><linearGradient id="${id}" x1="18" y1="6" x2="82" y2="94" gradientUnits="userSpaceOnUse">` +
  `<stop offset="0" stop-color="${L.gradientFrom}"/><stop offset="1" stop-color="${L.gradientTo}"/>` +
  `</linearGradient></defs>`

/** The full mark, for every surface big enough to show the shadow. */
function logoMark(id = GRADIENT_ID): string {
  return [
    gradient(id),
    // The pin floats: a soft ellipse grounds it, as in the brand sheet.
    `<ellipse cx="50" cy="94" rx="13" ry="3.6" fill="${L.shadow}" opacity="0.45"/>`,
    `<path d="${PIN_BODY} ${PIN_HOLE}" fill="url(#${id})" fill-rule="evenodd"/>`,
  ].join('')
}

/**
 * At 16 px the shadow turns into a grey smudge under the pin, so the smallest
 * tab size drops it and keeps the mark itself.
 */
function logoMini(id = 'brand-mini'): string {
  return [gradient(id), `<path d="${PIN_BODY} ${PIN_HOLE}" fill="url(#${id})" fill-rule="evenodd"/>`].join('')
}

/**
 * One flat silhouette for Android's themed icons: the system recolours this
 * layer, so the hole must be transparency rather than another colour.
 */
function logoSilhouette(id: string): string {
  return (
    `<defs><mask id="${id}">` +
    `<path d="${PIN_BODY} ${PIN_HOLE}" fill="white" fill-rule="evenodd"/>` +
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
 * Browser tab icon: rounded square, with the art clipped to it so nothing can
 * poke out past the rounded corners.
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
 * circle of about 61% diameter survives all of them. The pin's furthest point
 * is its tip, 43 units from centre, which lands at 21.5% against a 30.5% limit.
 */
const ADAPTIVE_SCALE = 0.5

// ---------------------------------------------------------------- CSS tokens

const kebab = (key: string) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)

function declarations(palette: Palette, indent: string): string {
  const colours = Object.entries(palette).map(([key, value]) => `${indent}--color-${kebab(key)}: ${value};`)
  // Aliases the apps already use, so their components need no renaming.
  colours.push(`${indent}--color-open: ${palette.success};`)
  colours.push(`${indent}--color-closed: ${palette.danger};`)
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
 * plus the tokens and a standalone logo for the app's own pages.
 */
async function nextApp(app: 'web' | 'admin', ground: string) {
  const full = tabIcon(ground, logoMark(), 0.95)
  const mini = tabIcon(ground, logoMini(), 1)

  await write(`${app}/src/app/icon.svg`, full)
  await write(
    `${app}/src/app/favicon.ico`,
    await ico([
      { size: 16, source: mini },
      { size: 32, source: full },
      { size: 48, source: full },
    ]),
  )
  await write(`${app}/src/app/apple-icon.png`, await png(fullBleed(ground, logoMark(), 0.9), 180))
  await write(`${app}/src/app/brand.css`, brandCss())
  // Served from public/, so pages use it as a plain <img> with no bundling.
  await write(`${app}/public/logo.svg`, svg(logoMark()))
}

async function main() {
  console.log('website')
  await nextApp('web', iconGround.public)

  console.log('admin - on warm ink, so its tab is distinguishable')
  await nextApp('admin', iconGround.admin)

  // Sizes match the Expo SDK 57 template these replace.
  console.log('mobile')
  await write('mobile/assets/icon.png', await png(fullBleed(iconGround.public, logoMark(), 0.9), 1024))
  await write('mobile/assets/android-icon-foreground.png', await png(svg(scaled(logoMark(), ADAPTIVE_SCALE)), 512))
  await write(
    'mobile/assets/android-icon-background.png',
    await png(svg(`<rect width="100" height="100" fill="${iconGround.public}"/>`), 512),
  )
  await write(
    'mobile/assets/android-icon-monochrome.png',
    await png(svg(scaled(logoSilhouette('mono'), ADAPTIVE_SCALE)), 432),
  )
  await write('mobile/assets/favicon.png', await png(tabIcon(iconGround.public, logoMark(), 0.95), 48))
  await write('mobile/assets/splash-icon.png', await png(svg(scaled(logoMark(), 0.62)), 1024))
  // For the app's own screens: home header, empty and error states.
  await write('mobile/assets/logo.png', await png(svg(logoMark()), 512))
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
