'use client'

import { useActionState } from 'react'
import { signIn } from '@/actions/auth'
import { SubmitButton } from '@/components/form-parts'
import { Mascot } from '@/components/mascot'
import { Card, ErrorBanner, Field, Input } from '@/components/ui'

export default function LoginPage() {
  const [state, action] = useActionState(signIn, {})

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center px-4">
      <Mascot size={112} className="mb-5" />

      <Card className="w-full">
        <h1 className="mb-1 text-center text-2xl font-extrabold tracking-tight">Place Map</h1>
        <p className="mb-6 text-center text-sm text-[var(--color-muted)]">Sign in to manage places.</p>

        <form action={action} className="space-y-4">
          <Field label="Password">
            <Input name="password" type="password" autoFocus required autoComplete="current-password" />
          </Field>

          <ErrorBanner message={state.error} />
          <SubmitButton>Sign in</SubmitButton>
        </form>
      </Card>
    </main>
  )
}
