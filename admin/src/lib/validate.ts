import type { z } from 'zod'

/**
 * Validates against the shared write schemas before anything leaves the server.
 *
 * The API would reject the same input, but its 400 arrives as an exception with
 * one message; parsing here turns a bad field into a message the operator can
 * act on, and saves a round trip for a typo.
 */
export function validate<S extends z.ZodType>(
  schema: S,
  value: unknown,
): { data: z.infer<S>; error?: undefined } | { data?: undefined; error: string } {
  const result = schema.safeParse(value)

  if (!result.success) {
    const issue = result.error.issues[0]
    const where = issue?.path.length ? `${issue.path.join('.')}: ` : ''
    return { error: `${where}${issue?.message ?? 'Invalid input'}` }
  }

  return { data: result.data }
}
