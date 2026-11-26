import type { ReactNode } from 'react'
import { Logo } from './logo'

/**
 * The body of a page that is not the page someone wanted: not found, or
 * something broke. One layout for all three (404, the locale error boundary,
 * the global one) so they read as the same site having the same bad moment.
 *
 * The status code, when there is one, sits huge and faint behind the mascot -
 * a recognisable "404" for anyone who knows what that means, and decoration
 * for everyone else, so it is hidden from screen readers; the h1 says it in
 * words.
 *
 * No hooks: the not-found pages render it on the server.
 */
export function StatusContent({
  code,
  title,
  body,
  actions,
  art,
}: {
  code?: string
  title: ReactNode
  body: ReactNode
  actions: ReactNode
  /** The mascot by default; the global error page passes a plain <img>. */
  art?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center py-16 text-center sm:py-24">
      <div className="relative mb-8 flex items-center justify-center">
        {code && (
          <span
            aria-hidden
            className="pointer-events-none absolute select-none text-[9rem] font-extrabold leading-none tracking-tighter text-[var(--color-line)] sm:text-[12rem]"
          >
            {code}
          </span>
        )}
        <span className="relative">{art ?? <Logo size={112} bob />}</span>
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-3 max-w-md text-pretty text-[var(--color-muted)]">{body}</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">{actions}</div>
    </div>
  )
}
