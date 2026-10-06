'use client'

import { useActionState } from 'react'
import { removeAmenityIcon, uploadAmenityIcon } from '@/actions/amenities'
import { SubmitButton } from '@/components/form-parts'
import { Button, ErrorBanner } from '@/components/ui'

/**
 * The amenity's picture, uploaded on its own rather than with the rest of the
 * form - a file only makes sense once the amenity exists, and an upload is
 * slow enough that it should not hold up saving a name.
 *
 * The emoji beside it stays either way: it is what shows while an image is
 * loading or missing, and it is all a Telegram button label can hold.
 */
export function AmenityIconUpload({
  id,
  slug,
  icon,
  iconImage,
  endpoint,
}: {
  id: number
  slug: string
  /** The emoji fallback, for the preview. */
  icon: string | null
  /** Storage path of the current image, or null. */
  iconImage: string | null
  /** Null until ImageKit is configured - upload is then switched off. */
  endpoint: string | null
}) {
  const [state, action] = useActionState(uploadAmenityIcon.bind(null, id, slug), {})
  const src = iconImage && endpoint ? `${endpoint}/${iconImage.replace(/^\/+/, '')}` : null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[var(--color-line)] bg-[var(--color-tint-soft)] text-3xl">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" className="size-full object-cover" />
          ) : (
            (icon ?? '🏷')
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Icon image</p>
          <p className="text-xs text-[var(--color-muted)]">
            {src
              ? 'Shown on the website instead of the emoji and the drawn icon.'
              : 'Optional. Without one, the website draws its own icon where it has one, and otherwise shows the emoji.'}
          </p>
        </div>

        {src && (
          // Its own form: a button inside the edit form would submit that one.
          <form action={removeAmenityIcon.bind(null, id)}>
            <Button variant="danger" type="submit">
              Remove
            </Button>
          </form>
        )}
      </div>

      {endpoint ? (
        <form action={action} className="flex items-center gap-3">
          <input
            type="file"
            name="file"
            accept="image/*"
            required
            className="min-w-0 flex-1 text-sm file:mr-3 file:rounded-md file:border file:border-[var(--color-line)] file:bg-transparent file:px-3 file:py-1.5 file:text-sm"
          />
          <SubmitButton>{src ? 'Replace' : 'Upload'}</SubmitButton>
        </form>
      ) : (
        <p className="rounded-md border border-[var(--color-line)] bg-[var(--color-canvas)] px-3 py-2 text-sm text-[var(--color-muted)]">
          Icon upload is off until ImageKit is configured - set <code>IMAGEKIT_URL_ENDPOINT</code> and{' '}
          <code>IMAGEKIT_PRIVATE_KEY</code> in this dashboard&apos;s environment. Everything else here
          works without it.
        </p>
      )}

      <ErrorBanner message={state.error} />
    </div>
  )
}
