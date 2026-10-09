import Link from 'next/link'
import { SUGGESTION_STATUSES, type SuggestionStatus } from '@place-map/shared'
import { mark, remove } from '@/actions/suggestions'
import { listAllPlaces, listSuggestions } from '@/lib/api'
import { LOCALES } from '@/lib/form'
import { Badge, Card, Empty, PageHeader } from '@/components/ui'
import { DeleteButton } from '@/components/form-parts'
import { ActionButton } from './action-button'

export const dynamic = 'force-dynamic'

/** Tabs. 'all' is not a status, so it is not in the shared list. */
const TABS = [...SUGGESTION_STATUSES, 'all'] as const
type Tab = (typeof TABS)[number]

const TAB_LABEL: Record<Tab, string> = {
  new: 'Unread',
  done: 'Acted on',
  ignored: 'Ignored',
  all: 'Everything',
}

const KIND_LABEL = { new_place: 'Missing place', correction: 'Correction' } as const

/** Date and time, because two reports an hour apart are often the same person. */
const WHEN = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function isTab(value: string | undefined): value is Tab {
  return TABS.includes((value ?? '') as Tab)
}

export default async function SuggestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const tab: Tab = isTab(status) ? status : 'new'

  // Places only to turn a place_id into a name. A correction that says "the
  // hours are wrong" is unreadable without knowing which place it is about.
  const [suggestions, places] = await Promise.all([
    listSuggestions(tab === 'all' ? undefined : tab),
    listAllPlaces(),
  ])

  const primary = LOCALES[0] ?? 'en'
  const nameOf = new Map(
    places.map((place) => [place.id, place.name[primary] ?? Object.values(place.name)[0] ?? place.slug]),
  )

  return (
    <>
      <PageHeader title="Suggestions" />

      <p className="mb-4 text-sm text-[var(--color-muted)]">
        What visitors sent from the site. Nobody else ever sees these. Acting on one means editing
        the place yourself &mdash; there is no button here that changes the directory.
      </p>

      <nav className="mb-4 flex flex-wrap gap-2">
        {TABS.map((value) => (
          <Link
            key={value}
            href={value === 'new' ? '/suggestions' : `/suggestions?status=${value}`}
            aria-current={value === tab ? 'page' : undefined}
            className={
              value === tab
                ? 'rounded-full bg-[var(--color-accent-soft)] px-4 py-1.5 text-sm font-bold text-[var(--color-accent)]'
                : 'rounded-full border border-[var(--color-line)] px-4 py-1.5 text-sm font-semibold text-[var(--color-muted)] transition hover:text-[var(--color-ink)]'
            }
          >
            {TAB_LABEL[value]}
          </Link>
        ))}
      </nav>

      {suggestions.length === 0 ? (
        <Card>
          <Empty>
            {tab === 'new'
              ? 'Nothing waiting. Anything sent from the site arrives here.'
              : `Nothing ${TAB_LABEL[tab].toLowerCase()}.`}
          </Empty>
        </Card>
      ) : (
        <ul className="space-y-3">
          {suggestions.map((suggestion) => {
            const place = suggestion.place_id ? nameOf.get(suggestion.place_id) : undefined

            return (
              <li key={suggestion.id}>
                <Card>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge>{KIND_LABEL[suggestion.kind]}</Badge>
                    {suggestion.status !== 'new' && <Badge>{TAB_LABEL[suggestion.status]}</Badge>}
                    {suggestion.lang && <Badge>{suggestion.lang}</Badge>}
                    <span className="ml-auto text-xs text-[var(--color-muted)]">
                      {WHEN.format(new Date(suggestion.created_at))}
                    </span>
                  </div>

                  {suggestion.name && <h2 className="text-lg font-bold">{suggestion.name}</h2>}

                  {suggestion.kind === 'correction' && (
                    <p className="text-sm text-[var(--color-muted)]">
                      {suggestion.place_id === null ? (
                        // The column is set null when a place is deleted, so
                        // the complaint outlives what it was about.
                        'About a place that has since been deleted.'
                      ) : (
                        <>
                          About{' '}
                          <Link
                            href={`/places/${suggestion.place_id}`}
                            className="font-bold text-[var(--color-accent)] hover:underline"
                          >
                            {place ?? `place ${suggestion.place_id}`}
                          </Link>
                        </>
                      )}
                    </p>
                  )}

                  {/* Whitespace kept: people type addresses across lines. */}
                  <p className="mt-2 whitespace-pre-wrap text-sm">{suggestion.note}</p>

                  {suggestion.contact && (
                    <p className="mt-2 text-sm text-[var(--color-muted)]">
                      Reply to <span className="font-semibold text-[var(--color-ink)]">{suggestion.contact}</span>
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {(['done', 'ignored', 'new'] as SuggestionStatus[])
                      .filter((next) => next !== suggestion.status)
                      .map((next) => (
                        <form key={next} action={mark.bind(null, suggestion.id, next)}>
                          <ActionButton
                            label={
                              next === 'done' ? 'Acted on' : next === 'ignored' ? 'Ignore' : 'Reopen'
                            }
                          />
                        </form>
                      ))}

                    <form action={remove.bind(null, suggestion.id)} className="ml-auto">
                      <DeleteButton confirm="Delete this suggestion? Ignoring it keeps the record instead." />
                    </form>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
