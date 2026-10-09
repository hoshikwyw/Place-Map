'use server'

import { revalidatePath } from 'next/cache'
import * as api from '@/lib/api'
import { requireSession } from '@/lib/auth'

/**
 * Deciding what visitors get to see.
 *
 * There is nothing to edit here and no form: the words are what somebody
 * wrote, and an editor who could change them would be publishing their own
 * opinion under a visitor's name. The only decision is whether it is visible.
 *
 * Publishing moves the place's rating - a database trigger recomputes it from
 * the published reviews - so these are the two actions in the dashboard that
 * change what the directory says about a place without touching the place.
 */

export async function publish(id: number, isPublished: boolean): Promise<void> {
  await requireSession()
  await api.setReviewPublished(id, isPublished)

  revalidatePath('/reviews')
  revalidatePath('/places')
  // The waiting count sits in the nav, on every page.
  revalidatePath('/', 'layout')
}

export async function remove(id: number): Promise<void> {
  await requireSession()

  // Offered, but hiding is the better answer: it keeps the record of what was
  // written and already judged, so the same review is not weighed twice.
  await api.deleteReview(id)

  revalidatePath('/reviews')
  revalidatePath('/places')
  revalidatePath('/', 'layout')
}
