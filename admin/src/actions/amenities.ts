'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { CreateAmenitySchema, UpdateAmenitySchema } from '@place-map/shared'
import * as api from '@/lib/api'
import { requireSession } from '@/lib/auth'
import { checkbox, localized, number, text } from '@/lib/form'
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
