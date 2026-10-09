import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import sharp from 'sharp'
import { ICON, MAX_UPLOAD_BYTES, PHOTO, checkFile, encode, uploadToImageKit } from '@/lib/imagekit'
import { imageUrl } from '@/lib/image-url'

/**
 * Pictures: what is accepted, what comes out, and what reaches ImageKit.
 *
 * `encode` runs real sharp against real images rather than a mock. The whole
 * point of it is the bytes it produces - the size gate and the EXIF rotation -
 * and a mocked encoder would assert nothing but that it was called.
 */

/**
 * A real image, generated rather than committed: no fixture file to go stale.
 *
 * Noise rather than flat colour, because a solid rectangle compresses to
 * almost nothing and the size gate would never be exercised. `sigma` is how
 * grainy: 30 is about as hard to compress as a real photograph, and 70 is
 * harder than any camera produces - useful only for the best-effort case.
 */
async function image(width: number, height: number, sigma = 30): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      // Ignored where noise is given, but sharp's type asks for a fill.
      background: '#808080',
      noise: { type: 'gaussian', mean: 128, sigma },
    },
  })
    .jpeg({ quality: 100 })
    .toBuffer()
}

const file = (name: string, type: string, size: number) =>
  new File([new Uint8Array(size)], name, { type })

describe('what the upload form accepts', () => {
  it('accepts an image', () => {
    const chosen = file('photo.jpg', 'image/jpeg', 1000)
    expect(checkFile(chosen)).toEqual({ file: chosen })
  })

  it('asks for a file when none was chosen', () => {
    expect(checkFile(null)).toEqual({ error: 'Choose an image first' })
  })

  it('treats an empty file as none chosen', () => {
    // An untouched file input submits a zero-byte entry rather than nothing.
    expect(checkFile(file('', 'application/octet-stream', 0))).toEqual({
      error: 'Choose an image first',
    })
  })

  it('refuses a plain string posted in place of a file', () => {
    expect(checkFile('not-a-file')).toEqual({ error: 'Choose an image first' })
  })

  it('refuses something that is not an image', () => {
    expect(checkFile(file('notes.pdf', 'application/pdf', 1000))).toEqual({
      error: 'That is not an image',
    })
  })

  it('refuses a file over the size limit, before decoding it', () => {
    // Checked before sharp sees it: decoding a 40 MB file to find out it is
    // too big spends the memory anyway.
    expect(checkFile(file('huge.jpg', 'image/jpeg', MAX_UPLOAD_BYTES + 1))).toEqual({
      error: 'That file is over 25 MB',
    })
  })

  it('accepts a file exactly on the limit', () => {
    expect(checkFile(file('big.jpg', 'image/jpeg', MAX_UPLOAD_BYTES))).toHaveProperty('file')
  })

  it('checks the size before the type, so a huge PDF reads as too big', () => {
    expect(checkFile(file('huge.pdf', 'application/pdf', MAX_UPLOAD_BYTES + 1))).toEqual({
      error: 'That file is over 25 MB',
    })
  })
})

describe('encoding a photo', () => {
  it('resizes down to the long edge', async () => {
    const result = await encode(await image(2400, 1600), PHOTO)
    expect(result.width).toBe(1200)
  }, 30_000)

  it('never enlarges a small one', async () => {
    // Upscaling invents detail and costs bytes for it.
    const result = await encode(await image(400, 300), PHOTO)
    expect(result.width).toBe(400)
  }, 30_000)

  it('gets a photo under the size gate', async () => {
    const result = await encode(await image(2400, 1600), PHOTO)
    expect(result.buffer.byteLength).toBeLessThanOrEqual(PHOTO.targetBytes)
  }, 30_000)

  it('returns its best effort for an image that cannot reach the gate', async () => {
    // Pure noise compresses worse than any photograph. The gate is best
    // effort: after the lowest quality step the result is returned whether or
    // not it fits, because refusing the upload would serve nobody.
    const result = await encode(await image(2400, 1600, 70), PHOTO)
    expect(result.width).toBe(1200)
    expect(result.buffer.byteLength).toBeGreaterThan(PHOTO.targetBytes)
    // Still far smaller than the original, which is the point.
    expect(result.buffer.byteLength).toBeLessThan(2_000_000)
  }, 30_000)

  it('produces WebP', async () => {
    const result = await encode(await image(800, 600), PHOTO)
    expect((await sharp(result.buffer).metadata()).format).toBe('webp')
  }, 30_000)

  it('makes an icon much smaller than a photo', async () => {
    const source = await image(1200, 1200)
    const icon = await encode(source, ICON)
    expect(icon.width).toBe(256)
    expect(icon.buffer.byteLength).toBeLessThanOrEqual(ICON.targetBytes)
  }, 30_000)

  it('applies EXIF orientation, so a phone photo is not sideways', async () => {
    // Orientation 6 means "rotate 90°": the stored pixels are 800x400 and the
    // picture is meant to be seen as 400x800.
    const sideways = await sharp(await image(800, 400))
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer()

    const result = await encode(sideways, PHOTO)
    expect(result.height).toBeGreaterThan(result.width)
  }, 30_000)
})

describe('sending it to ImageKit', () => {
  let sent: { url: string; headers: Record<string, string>; body: FormData } | null = null

  beforeEach(() => {
    sent = null
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      sent = {
        url: String(url),
        headers: init.headers as Record<string, string>,
        body: init.body as FormData,
      }
      return new Response(JSON.stringify({ filePath: '/places/cafe-123.webp' }), { status: 200 })
    })
  })

  afterEach(() => vi.unstubAllGlobals())

  it('returns the stored path, which is all the API ever sees', async () => {
    const path = await uploadToImageKit('private-key', Buffer.from('x'), 'cafe.webp', '/places')
    expect(path).toBe('/places/cafe-123.webp')
  })

  it('authenticates with the private key as HTTP basic', async () => {
    await uploadToImageKit('private-key', Buffer.from('x'), 'cafe.webp', '/places')
    const expected = `Basic ${Buffer.from('private-key:').toString('base64')}`
    expect(sent!.headers.Authorization).toBe(expected)
  })

  it('asks ImageKit to make the name unique', async () => {
    // Two places with a photo called "front.jpg" must not overwrite each other.
    await uploadToImageKit('private-key', Buffer.from('x'), 'front.webp', '/places')
    expect(sent!.body.get('useUniqueFileName')).toBe('true')
    expect(sent!.body.get('folder')).toBe('/places')
  })

  it('raises the message ImageKit gave when it refuses', async () => {
    vi.stubGlobal('fetch', async () =>
      new Response(JSON.stringify({ message: 'Your account has exceeded its quota' }), {
        status: 403,
      }),
    )
    await expect(
      uploadToImageKit('private-key', Buffer.from('x'), 'cafe.webp', '/places'),
    ).rejects.toThrow('Your account has exceeded its quota')
  })

  it('raises when the answer looks fine but carries no path', async () => {
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ ok: true }), { status: 200 }))
    await expect(
      uploadToImageKit('private-key', Buffer.from('x'), 'cafe.webp', '/places'),
    ).rejects.toThrow(/failed/i)
  })
})

describe('turning a stored path into a URL', () => {
  const withImageKit = async (endpoint: string | undefined, run: () => void) => {
    const before = process.env.IMAGEKIT_URL_ENDPOINT
    const beforeKey = process.env.IMAGEKIT_PRIVATE_KEY
    // Assigning undefined would store the *string* "undefined", which reads
    // as configured - the exact mistake this test is checking for.
    if (endpoint === undefined) {
      delete process.env.IMAGEKIT_URL_ENDPOINT
      delete process.env.IMAGEKIT_PRIVATE_KEY
    } else {
      process.env.IMAGEKIT_URL_ENDPOINT = endpoint
      process.env.IMAGEKIT_PRIVATE_KEY = 'private-key'
    }

    try {
      run()
    } finally {
      if (before === undefined) delete process.env.IMAGEKIT_URL_ENDPOINT
      else process.env.IMAGEKIT_URL_ENDPOINT = before
      if (beforeKey === undefined) delete process.env.IMAGEKIT_PRIVATE_KEY
      else process.env.IMAGEKIT_PRIVATE_KEY = beforeKey
    }
  }

  it('joins the endpoint and the path', async () => {
    await withImageKit('https://ik.example/x', () => {
      expect(imageUrl('/places/cafe.webp')).toBe('https://ik.example/x/places/cafe.webp')
    })
  })

  it('does not double the slash', async () => {
    await withImageKit('https://ik.example/x/', () => {
      expect(imageUrl('/places/cafe.webp')).toBe('https://ik.example/x/places/cafe.webp')
    })
  })

  it('is null when there is no path', async () => {
    await withImageKit('https://ik.example/x', () => {
      expect(imageUrl(null)).toBeNull()
      expect(imageUrl(undefined)).toBeNull()
    })
  })

  it('is null when ImageKit is not configured, rather than a half-built URL', async () => {
    // The dashboard works without ImageKit; a broken image would be worse
    // than no image.
    await withImageKit(undefined, () => {
      expect(imageUrl('/places/cafe.webp')).toBeNull()
    })
  })
})
