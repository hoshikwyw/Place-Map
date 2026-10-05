'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { CreateCategorySchema, UpdateCategorySchema } from '@place-map/shared'
import * as api from '@/lib/api'
import { requireSession } from '@/lib/auth'
import { env } from '@/lib/env'
import { checkbox, localized, number, text } from '@/lib/form'
import { ICON, checkFile, encode, uploadToImageKit } from '@/lib/imagekit'
import { validate } from '@/lib/validate'
import type { ActionState } from './auth'

/**
 * Server actions, not client fetches through a proxy route.
 *
 * `ADMIN_API_KEY` stays on the server either way, but an action needs no
 * endpoint of its own, no client-side fetch layer and no manual cache
 * invalidation - `revalidatePath` covers it. Every action re-checks the session:
 * an action is a POST endpoint, and the page guard that rendered the form is
 * not a guard on the action itself.
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

export async function createCategory(_state: ActionState, form: FormData): Promise<ActionState> {
  await requireSession()

  const parsed = validate(CreateCategorySchema, fields(form))
  if (parsed.error) return { error: parsed.error }

  try {
    await api.createCategory(parsed.data)
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not create category' }
  }

  revalidatePath('/categories')
  redirect('/categories')
}

export async function updateCategory(
  id: number,
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireSession()

  const parsed = validate(UpdateCategorySchema, fields(form))
  if (parsed.error) return { error: parsed.error }

  try {
    await api.updateCategory(id, parsed.data)
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not save category' }
  }

  revalidatePath('/categories')
  redirect('/categories')
}

/**
 * The icon image is uploaded on its own, not with the rest of the form: a file
 * only makes sense once the category exists, and uploading it is slow enough
 * that it should not hold up saving a name.
 */
export async function uploadCategoryIcon(
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
      '/categories',
    )
    await api.updateCategory(id, { icon_image: storagePath })
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Upload failed' }
  }

  revalidatePath(`/categories/${id}`)
  revalidatePath('/categories')
  return {}
}

/** Clears the icon image. The file stays on ImageKit, as deleted photos do. */
export async function removeCategoryIcon(id: number): Promise<void> {
  await requireSession()
  await api.updateCategory(id, { icon_image: null })
  revalidatePath(`/categories/${id}`)
  revalidatePath('/categories')
}

export async function deleteCategory(id: number): Promise<void> {
  await requireSession()

  // The API refuses this while the category still holds places, and that error
  // is written to be shown as-is.
  await api.deleteCategory(id)

  revalidatePath('/categories')
  redirect('/categories')
}
