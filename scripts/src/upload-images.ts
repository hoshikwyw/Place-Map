import { readdir, readFile, stat } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { parseArgs } from 'node:util'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { env } from './env.ts'
import { upload } from './imagekit.ts'

/**
 * Resize local photos, push them to ImageKit, record them in `place_images`.
 *
 * A CLI on purpose, not an API endpoint. Resizing a 4 MB photo costs hundreds
 * of milliseconds and the Worker's budget is 10 ms - but the real reason is
 * that image size is the free-tier limit that actually bites. A handful of
 * unresized phone photos fills the storage quota in a week. Keeping the only
 * upload path here means nothing reaches the CDN without passing the size gate.
 *
 * Layout it expects:
 *
 *   scripts/images-in/
 *     cafe-central/       <- folder name must equal the place's slug
 *       front.jpg
 *       interior.jpg
 *     plov-house/
 *       ...
 *
 * Usage:
 *   pnpm --filter @place-map/scripts upload -- --dry-run
 *   pnpm --filter @place-map/scripts upload -- --place cafe-central
 *   pnpm --filter @place-map/scripts upload -- --replace
 */

const SOURCE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff', '.avif'])

/** Quality ladder, walked downward until the encoded file fits the budget. */
const QUALITY_STEPS = [82, 75, 68, 60, 52, 45]

const USAGE = `
Resize local photos, upload them to ImageKit, record them in place_images.

  --dir <path>        source folder, one subfolder per place slug (./images-in)
  --place <slug>      only process this one place
  --replace           delete the place's existing image rows first
  --dry-run           resize and report, upload nothing
  --max-width <px>    longest edge after resize (1200)
  --target-kb <kb>    size budget per image (200)
  --help

Run it through pnpm so the root .env is loaded:
  pnpm --filter @place-map/scripts upload -- --dry-run
`

const { values } = parseArgs({
  options: {
    dir: { type: 'string', default: './images-in' },
    place: { type: 'string' },
    replace: { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false },
    'max-width': { type: 'string', default: '1200' },
    'target-kb': { type: 'string', default: '200' },
    help: { type: 'boolean', default: false },
  },
})

if (values.help) {
  console.log(USAGE)
  process.exit(0)
}

const opts = {
  dir: values.dir as string,
  place: values.place,
  replace: values.replace as boolean,
  dryRun: values['dry-run'] as boolean,
  maxWidth: Number(values['max-width']),
  targetBytes: Number(values['target-kb']) * 1024,
}

const kb = (bytes: number) => Math.round(bytes / 1024) + ' KB'

// ------------------------------------------------------------------ encoding

interface Encoded {
  buffer: Buffer
  width: number
  height: number
  quality: number
}

/**
 * `rotate()` with no argument applies the EXIF orientation tag and then drops
 * it. Skipping it is how sideways phone photos reach production.
 */
async function encode(source: Buffer): Promise<Encoded> {
  let last: Encoded | undefined

  for (const quality of QUALITY_STEPS) {
    const { data, info } = await sharp(source)
      .rotate()
      .resize({ width: opts.maxWidth, withoutEnlargement: true })
      .webp({ quality })
      .toBuffer({ resolveWithObject: true })

    last = { buffer: data, width: info.width, height: info.height, quality }
    if (data.byteLength <= opts.targetBytes) return last
  }

  return last as Encoded
}

// -------------------------------------------------------------------- lookup

async function listPlaceFolders(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true })
  const folders = entries.filter((e) => e.isDirectory()).map((e) => e.name)
  return opts.place ? folders.filter((name) => name === opts.place) : folders.sort()
}

async function listImages(folder: string): Promise<string[]> {
  const entries = await readdir(folder, { withFileTypes: true })
  return entries
    .filter((e) => e.isFile() && SOURCE_EXTENSIONS.has(extname(e.name).toLowerCase()))
    .map((e) => e.name)
    .sort()
}

// ------------------------------------------------------------------ the work

async function main() {
  try {
    await stat(opts.dir)
  } catch {
    console.error('No such directory: ' + opts.dir)
    console.error('Create it and add one folder per place slug. See the header of this file.')
    process.exit(1)
  }

  const supabase = createClient(env.supabaseUrl, env.supabaseKey, {
    auth: { persistSession: false },
  })

  const slugs = await listPlaceFolders(opts.dir)
  if (slugs.length === 0) {
    console.error(
      opts.place ? `No folder named '${opts.place}' in ${opts.dir}` : `No place folders in ${opts.dir}`,
    )
    process.exit(1)
  }

  if (opts.dryRun) console.log('DRY RUN - nothing will be uploaded or written.\n')

  let uploaded = 0
  let skipped = 0
  let bytesIn = 0
  let bytesOut = 0

  for (const slug of slugs) {
    const { data: place, error } = await supabase
      .from('places')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (error) throw new Error(`Looking up '${slug}': ${error.message}`)
    if (!place) {
      console.warn(`! ${slug} - no place has this slug, skipping folder`)
      continue
    }

    const files = await listImages(join(opts.dir, slug))
    if (files.length === 0) {
      console.warn(`! ${slug} - folder has no supported images`)
      continue
    }

    console.log(`\n${slug} (place ${place.id}) - ${files.length} image(s)`)

    if (opts.replace && !opts.dryRun) {
      const { error: deleteError } = await supabase
        .from('place_images')
        .delete()
        .eq('place_id', place.id)
      if (deleteError) throw new Error(`Clearing images for '${slug}': ${deleteError.message}`)
      console.log('  cleared existing rows (--replace)')
    }

    const { data: existing, error: existingError } = await supabase
      .from('place_images')
      .select('storage_path')
      .eq('place_id', place.id)

    if (existingError) throw new Error(`Reading images for '${slug}': ${existingError.message}`)
    const known = new Set((existing ?? []).map((row) => row.storage_path))

    for (const [index, file] of files.entries()) {
      const position = index + 1
      const fileName = `${slug}-${position}.webp`
      const folder = `/places/${slug}`
      const storagePath = `${folder}/${fileName}`

      // The path is a deterministic function of (slug, position), so a re-run
      // is a no-op rather than a second copy of the same photo.
      if (known.has(storagePath)) {
        console.log(`  = ${file} -> already recorded, skipping`)
        skipped++
        continue
      }

      const source = await readFile(join(opts.dir, slug, file))
      const encoded = await encode(source)

      bytesIn += source.byteLength
      bytesOut += encoded.buffer.byteLength

      const over = encoded.buffer.byteLength > opts.targetBytes ? '  OVER BUDGET' : ''
      console.log(
        `  + ${file} ${kb(source.byteLength)} -> ${kb(encoded.buffer.byteLength)} ` +
          `(${encoded.width}x${encoded.height}, q${encoded.quality})${over}`,
      )

      if (opts.dryRun) {
        uploaded++
        continue
      }

      const result = await upload(encoded.buffer, { fileName, folder })

      const { error: insertError } = await supabase.from('place_images').insert({
        place_id: place.id,
        storage_path: result.filePath,
        width: result.width ?? encoded.width,
        height: result.height ?? encoded.height,
        sort_order: position * 10,
      })

      if (insertError) throw new Error(`Recording '${storagePath}': ${insertError.message}`)

      // telegram_file_id stays null. The bot fills it on its first send, and
      // every send after that is served free from Telegram's own CDN.
      uploaded++
    }
  }

  const saved =
    bytesIn > 0
      ? `  ${kb(bytesIn)} -> ${kb(bytesOut)} (${Math.round((1 - bytesOut / bytesIn) * 100)}% smaller)`
      : ''

  console.log(`\n${opts.dryRun ? 'Would upload' : 'Uploaded'} ${uploaded}, skipped ${skipped}.${saved}`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
