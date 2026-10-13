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

/**
 * Pin: head circle centred (50,42) r32, drawn down to a point at (50,90).
 *
 * The proportions are measured off the brand sheet rather than chosen: the
 * head is 80% of the mark's height there, and the hole is 41% of the head.
 * An earlier version was a taller teardrop - head 64% of the height - which
 * read as a generic map pin rather than as this one.
 */
const PIN_BODY = 'M50 90 C45 80 18 64 18 42 A32 32 0 1 1 82 42 C82 64 55 80 50 90 Z'
/** The hole, as a subpath: two arcs, so evenodd cuts it out of the body. */
const PIN_HOLE = 'M63 42 A13 13 0 1 0 37 42 A13 13 0 1 0 63 42 Z'

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
    // Wide and close under the tip, as on the sheet, where it is about four
    // fifths of the head's width. A narrow ellipse reads as a smudge.
    `<ellipse cx="50" cy="92" rx="26" ry="5" fill="${L.shadow}" opacity="0.5"/>`,
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
 * circle of about 61% diameter survives all of them. The pin's furthest points
 * are its tip (50,90) and the crown of its head (50,10), both 40 units from
 * centre, which land at 20% against a 30.5% limit.
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
  color-scheme: light;
${declarations(light, '  ')}
${radii}
}

/* The visitor's explicit choice, set on <html> by the theme toggle. */
:root[data-theme='dark'] {
  color-scheme: dark;
${declarations(dark, '  ')}
}

/*
 * No choice made: follow the system. The :not() keeps this from overriding a
 * visitor who picked light while their system is dark - same specificity as
 * the block above, and this one comes later, so without it the system would
 * win over the choice.
 */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    color-scheme: dark;
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
 * The link preview card: 1200x630, the size Facebook, Viber, Telegram and the
 * rest crop to. A place page sends its own photo instead; this is for every
 * other page, which until now shared as a bare link with no picture at all.
 *
 * Text is drawn with the system's own sans: the file is generated here and
 * committed, so it has to render on this machine rather than on a build
 * server, and embedding a font to draw six words would be a lot of bytes for
 * the saving.
 */
function openGraph(): string {
  const W = 1200
  const H = 630

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
    `<defs>`,
    `<linearGradient id="bg" x1="0" y1="0" x2="${W}" y2="${H}" gradientUnits="userSpaceOnUse">`,
    `<stop offset="0" stop-color="${light.bannerFrom}"/><stop offset="1" stop-color="${light.bannerTo}"/>`,
    `</linearGradient>`,
    // In the pin's own 100-unit space, not the card's: the mark is drawn
    // inside a scaled group, so userSpaceOnUse resolves against that group.
    // Page coordinates here put the whole gradient off the shape and the pin
    // came out flat violet.
    `<linearGradient id="mark" x1="18" y1="6" x2="82" y2="94" gradientUnits="userSpaceOnUse">`,
    `<stop offset="0" stop-color="${L.gradientFrom}"/><stop offset="1" stop-color="${L.gradientTo}"/>`,
    `</linearGradient>`,
    `</defs>`,
    `<rect width="${W}" height="${H}" fill="url(#bg)"/>`,

    // The mark, drawn at 260 units on the 100-unit box it is designed in.
    `<g transform="translate(150 185) scale(2.6)">`,
    `<ellipse cx="50" cy="92" rx="26" ry="5" fill="${L.shadow}" opacity="0.5"/>`,
    `<path d="${PIN_BODY} ${PIN_HOLE}" fill="url(#mark)" fill-rule="evenodd"/>`,
    `</g>`,

    `<text x="470" y="330" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="96" font-weight="700" fill="${light.ink}">Place-Map</text>`,
    `<text x="474" y="392" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="38" fill="${light.muted}">Find places. Hangout easily.</text>`,
    `<text x="474" y="452" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="30" fill="${light.accent}">Yangon, Myanmar</text>`,
    `</svg>`,
  ].join('')
}

/** A PNG at an exact width and height, for art that is not square. */
const pngAt = (source: string, width: number, height: number) =>
  sharp(Buffer.from(source), { density: 144 })
    .resize(width, height)
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

  // What an installed app shows on a home screen. The website only: the
  // dashboard has no manifest, and nobody installs an admin panel.
  //
  // Android asks for 192 and 512. The maskable one is drawn smaller inside its
  // square because the launcher crops it to whatever shape the phone uses - a
  // circle, a squircle - and a full-bleed mark loses its edges to that crop.
  if (app === 'web') {
    await write(`${app}/public/og.png`, await pngAt(openGraph(), 1200, 630))
    await write(`${app}/public/icon-192.png`, await png(fullBleed(ground, logoMark(), 0.9), 192))
    await write(`${app}/public/icon-512.png`, await png(fullBleed(ground, logoMark(), 0.9), 512))
    await write(
      `${app}/public/icon-maskable-512.png`,
      await png(fullBleed(ground, logoMark(), 0.6), 512),
    )
  }
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
