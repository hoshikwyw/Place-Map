'use server'

import { redirect } from 'next/navigation'
import { endSession, passwordMatches, startSession } from '@/lib/auth'

export interface ActionState {
  error?: string
}

export async function signIn(_state: ActionState, form: FormData): Promise<ActionState> {
  const password = form.get('password')

  if (typeof password !== 'string' || !passwordMatches(password)) {
    // Deliberately vague and deliberately slow-ish: the comparison itself is
    // constant time, and there is nothing here to enumerate.
    return { error: 'Wrong password' }
  }

  await startSession()
  redirect('/places')
}

export async function signOut(): Promise<void> {
  await endSession()
  redirect('/login')
}
