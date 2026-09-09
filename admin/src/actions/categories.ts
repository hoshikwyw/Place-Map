'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { CreateCategorySchema, UpdateCategorySchema } from '@place-map/shared'
import * as api from '@/lib/api'
import { requireSession } from '@/lib/auth'
import { checkbox, localized, number, text } from '@/lib/form'
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

export async function deleteCategory(id: number): Promise<void> {
  await requireSession()

  // The API refuses this while the category still holds places, and that error
  // is written to be shown as-is.
  await api.deleteCategory(id)

  revalidatePath('/categories')
  redirect('/categories')
}
