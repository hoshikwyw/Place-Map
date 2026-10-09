'use client'

import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui'

/**
 * A submit button that goes quiet while its own form is in flight.
 *
 * There are three of these on every row, so without `useFormStatus` a double
 * click sends the second status after the first and the row ends up in
 * whichever state arrived last.
 */
export function ActionButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant="ghost" disabled={pending}>
      {pending ? 'Saving…' : label}
    </Button>
  )
}
