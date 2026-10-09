'use server'

import { revalidatePath } from 'next/cache'
import type { SuggestionStatus } from '@place-map/shared'
import * as api from '@/lib/api'
import { requireSession } from '@/lib/auth'

/**
 * Dealing with what visitors sent in.
 *
 * There is no form here and nothing to validate: the only decision is whether
 * a message has been acted on. Everything else about the row is what somebody
 * typed, and an editor who could edit it would be editing the evidence.
 */

export async function mark(id: number, status: SuggestionStatus): Promise<void> {
  await requireSession()
  await api.markSuggestion(id, status)
  revalidatePath('/suggestions')
  // The unread count sits in the dashboard nav, on every page.
  revalidatePath('/', 'layout')
}

export async function remove(id: number): Promise<void> {
  await requireSession()

  // Offered, but not the obvious button: 'ignored' keeps the record of what
  // was already considered, so the same suggestion is not weighed twice.
  await api.deleteSuggestion(id)
  revalidatePath('/suggestions')
  revalidatePath('/', 'layout')
}
