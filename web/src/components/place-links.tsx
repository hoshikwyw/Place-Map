import { LINK_LABELS, type PlaceLink } from '@place-map/shared'

/**
 * A place's social pages, as a row of buttons.
 *
 * Labelled with the platform's name rather than its logo: the logos are
 * trademarks with their own usage rules, they need upkeep when a brand changes,
 * and a name is legible to someone who does not recognise a glyph. The website
 * itself is shown separately, above these.
 */

/**
 * `links` is typed as an array, but it only arrived with migration 0005: an
 * API that has not been redeployed, and any response cached before then, has
 * no such field. The type says one thing and the wire says another, so this
 * checks rather than trusts - the same reason Rating tolerates a missing
 * average.
 */
export function PlaceLinks({ links, label }: { links?: PlaceLink[] | null; label: string }) {
  if (!Array.isArray(links) || links.length === 0) return null

  return (
    <div>
      <h2 className="mb-2 text-sm font-bold text-[var(--color-muted)]">{label}</h2>
      <ul className="flex flex-wrap gap-2">
        {links.map((link) => (
          <li key={`${link.type}-${link.url}`}>
            <a
              href={link.url}
              target="_blank"
              // noreferrer as well as noopener: these are pages we do not run.
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-2 text-sm font-bold transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              {link.label || LINK_LABELS[link.type]}
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-3.5 opacity-60"
              >
                <path d="M7 17 17 7M9 7h8v8" />
              </svg>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
