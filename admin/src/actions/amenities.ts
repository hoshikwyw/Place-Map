'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { CreateAmenitySchema, UpdateAmenitySchema } from '@place-map/shared'
import * as api from '@/lib/api'
import { requireSession } from '@/lib/auth'
import { env } from '@/lib/env'
import { checkbox, localized, number, text } from '@/lib/form'
import { ICON, checkFile, encode, uploadToImageKit } from '@/lib/imagekit'
import { validate } from '@/lib/validate'
import type { ActionState } from './auth'

/**
 * The amenity catalog: the labels a place's chips resolve to.
 *
 * Deliberately the same shape as the category actions. Every one re-checks the
 * session, because an action is a POST endpoint of its own and the guard on
 * the page that rendered the form is not a guard on the action.
 */

function fields(form: FormData) {
  return {
    slug: text(form, 'slug') ?? '',
    name: localized(form, 'name') ?? {},
    icon: text(form, 'icon'),
    // Carried through a hidden field: saving the rest of the form must not
    // drop an icon image that was uploaded separately.
    icon_image: text(form, 'icon_image'),
    sort_order: number(form, 'sort_order') ?? 0,
    is_active: checkbox(form, 'is_active'),
  }
}

export async function createAmenity(_state: ActionState, form: FormData): Promise<ActionState> {
  await requireSession()

  const parsed = validate(CreateAmenitySchema, fields(form))
  if (parsed.error) return { error: parsed.error }

  try {
    await api.createAmenity(parsed.data)
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not create amenity' }
  }

  revalidatePath('/amenities')
  revalidatePath('/places')
  redirect('/amenities')
}

export async function updateAmenity(
  id: number,
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireSession()

  const parsed = validate(UpdateAmenitySchema, fields(form))
  if (parsed.error) return { error: parsed.error }

  try {
    await api.updateAmenity(id, parsed.data)
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not save amenity' }
  }

  revalidatePath('/amenities')
  // The place form's checkboxes are built from this list.
  revalidatePath('/places')
  redirect('/amenities')
}

/**
 * The icon image is uploaded on its own, not with the rest of the form: a file
 * only makes sense once the amenity exists, and uploading it is slow enough
 * that it should not hold up saving a name.
 */
export async function uploadAmenityIcon(
  id: number,
  slug: string,
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireSession()

  // The page hides the form when ImageKit is unset, but an action is its own
  // POST endpoint and must refuse on its own.
  const imagekit = env.imagekit
  if (!imagekit) {
    return { error: 'Icon upload is not configured - set IMAGEKIT_URL_ENDPOINT and IMAGEKIT_PRIVATE_KEY.' }
  }

  const checked = checkFile(form.get('file'))
  if ('error' in checked) return { error: checked.error }

  try {
    const encoded = await encode(Buffer.from(await checked.file.arrayBuffer()), ICON)
    const storagePath = await uploadToImageKit(
      imagekit.privateKey,
      encoded.buffer,
      `${slug}-${Date.now()}.webp`,
      '/amenities',
    )
    await api.updateAmenity(id, { icon_image: storagePath })
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Upload failed' }
  }

  revalidatePath(`/amenities/${id}`)
  revalidatePath('/amenities')
  // The place form shows these beside each tick box.
  revalidatePath('/places')
  return {}
}

export async function removeAmenityIcon(id: number): Promise<void> {
  await requireSession()
  await api.updateAmenity(id, { icon_image: null })
  revalidatePath(`/amenities/${id}`)
  revalidatePath('/amenities')
}

export async function deleteAmenity(id: number): Promise<void> {
  await requireSession()

  // Nothing in the database points here - a place stores the slug as text - so
  // this always succeeds. The places that carry the slug keep it and render
  // one chip fewer, which is why the form says how many that is first.
  await api.deleteAmenity(id)

  revalidatePath('/amenities')
  revalidatePath('/places')
  redirect('/amenities')
}
