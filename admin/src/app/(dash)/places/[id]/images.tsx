'use client'

import { useActionState } from 'react'
import { moveImage, removeImage, uploadImage } from '@/actions/images'
import type { ImageRow } from '@/lib/api'
import { SubmitButton } from '@/components/form-parts'
import { Badge, Button, Card, Empty, ErrorBanner } from '@/components/ui'

/**
 * Order matters beyond looks: the first image is the one the bot sends with the
 * place, and the one the web app uses as a card thumbnail.
 */
export function ImageManager({
  placeId,
  placeSlug,
  images,
  endpoint,
}: {
  placeId: number
  placeSlug: string
  images: ImageRow[]
  /** Null until ImageKit is configured - upload is then switched off. */
  endpoint: string | null
}) {
  const [state, action] = useActionState(uploadImage.bind(null, placeId, placeSlug), {})

  return (
    <Card className="mt-5">
      <h2 className="mb-1 text-sm font-bold">Photos</h2>
      <p className="mb-4 text-sm text-[var(--color-muted)]">
        Resized to 1200px WebP under 200 KB before upload. The first photo is the one the bot sends.
      </p>

      {endpoint ? (
        <form action={action} className="mb-5 flex items-center gap-3">
          <input
            type="file"
            name="file"
            accept="image/*"
            required
            className="text-sm file:mr-3 file:rounded-md file:border file:border-[var(--color-line)] file:bg-transparent file:px-3 file:py-1.5 file:text-sm"
          />
          <SubmitButton>Upload</SubmitButton>
        </form>
      ) : (
        <p className="mb-5 rounded-md border border-[var(--color-line)] bg-[var(--color-canvas)] px-3 py-2 text-sm text-[var(--color-muted)]">
          Photo upload is off until ImageKit is configured - set <code>IMAGEKIT_URL_ENDPOINT</code> and{' '}
          <code>IMAGEKIT_PRIVATE_KEY</code> in this dashboard&apos;s environment. Everything else here works
          without it.
        </p>
      )}

      <ErrorBanner message={state.error} />

      {images.length === 0 ? (
        <Empty>No photos yet.</Empty>
      ) : (
        <ul className="space-y-3">
          {images.map((image, index) => (
            <li key={image.id} className="flex items-center gap-3">
              {/* Plain img, not next/image: these are CDN thumbnails only the
                  operator sees, and optimising them spends a metered resource
                  for no benefit. */}
              {endpoint ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`${endpoint}/${image.storage_path.replace(/^\/+/, '')}`}
                  alt=""
                  className="h-16 w-24 rounded border border-[var(--color-line)] object-cover"
                />
              ) : (
                // No CDN base to build a URL from: show the stored path, so the
                // row is still identifiable and can be reordered or removed.
                <span className="w-24 truncate text-xs text-[var(--color-muted)]">{image.storage_path}</span>
              )}

              <span className="flex-1 text-xs text-[var(--color-muted)]">
                {image.width}×{image.height}
                {index === 0 && <Badge>bot photo</Badge>}
                {/* Present only after the bot has sent it once; from then on
                    Telegram serves it and the CDN is untouched. */}
                {image.telegram_file_id && <Badge>cached on Telegram</Badge>}
              </span>

              <form action={moveImage.bind(null, placeId, image.id, 'up')}>
                <Button variant="ghost" type="submit" disabled={index === 0}>
                  ↑
                </Button>
              </form>
              <form action={moveImage.bind(null, placeId, image.id, 'down')}>
                <Button variant="ghost" type="submit" disabled={index === images.length - 1}>
                  ↓
                </Button>
              </form>
              <form action={removeImage.bind(null, placeId, image.id)}>
                <Button
                  variant="danger"
                  type="submit"
                  onClick={(event) => {
                    if (!window.confirm('Remove this photo?')) event.preventDefault()
                  }}
                >
                  Remove
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
