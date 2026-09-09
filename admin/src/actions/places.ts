'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { CreatePlaceSchema, UpdatePlaceSchema } from '@place-map/shared'
import * as api from '@/lib/api'
import { requireSession } from '@/lib/auth'
import { HoursParseError, checkbox, hours, localized, number, text } from '@/lib/form'
import { validate } from '@/lib/validate'
import type { ActionState } from './auth'

function fields(form: FormData) {
  return {
    category_id: number(form, 'category_id') ?? 0,
    slug: text(form, 'slug') ?? '',
    name: localized(form, 'name') ?? {},
    description: localized(form, 'description'),
    address: text(form, 'address'),
    lat: number(form, 'lat'),
    lng: number(form, 'lng'),
    phone: text(form, 'phone'),
    website: text(form, 'website'),
    opening_hours: hours(form),
    sort_order: number(form, 'sort_order') ?? 0,
    is_active: checkbox(form, 'is_active'),
  }
}

/** The hours boxes are free text, so a typo there is a message, not a crash. */
function readFields(form: FormData) {
  try {
    return { values: fields(form) }
  } catch (error) {
    if (error instanceof HoursParseError) return { error: error.message }
    throw error
  }
}

export async function createPlace(_state: ActionState, form: FormData): Promise<ActionState> {
  await requireSession()

  const read = readFields(form)
  if (read.error) return { error: read.error }

  const parsed = validate(CreatePlaceSchema, read.values)
  if (parsed.error) return { error: parsed.error }

  let created
  try {
    created = await api.createPlace(parsed.data)
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not create place' }
  }

  revalidatePath('/places')
  // Straight to the editor: a new place has no photos yet, and that is the next
  // thing anyone entering data wants to do.
  redirect(`/places/${created.id}`)
}

export async function updatePlace(
  id: number,
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireSession()

  const read = readFields(form)
  if (read.error) return { error: read.error }

  const parsed = validate(UpdatePlaceSchema, read.values)
  if (parsed.error) return { error: parsed.error }

  try {
    await api.updatePlace(id, parsed.data)
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not save place' }
  }

  revalidatePath('/places')
  revalidatePath(`/places/${id}`)
  return {}
}

export async function deletePlace(id: number): Promise<void> {
  await requireSession()
  await api.deletePlace(id)

  revalidatePath('/places')
  redirect('/places')
}
