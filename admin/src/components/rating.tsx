/**
 * A place's rating, as the dashboard shows it: star, score, and how many
 * ratings it covers. Same rule as the public site - nothing at all when a place
 * is unrated, rather than a zero that reads as "rated badly".
 */
export function Rating({ rating, count }: { rating: number | null | undefined; count: number | null | undefined }) {
  const score = Number(rating)
  if (rating == null || !Number.isFinite(score)) return null

  const total = Number.isFinite(Number(count)) ? Number(count) : 0

  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-bold"
      title={total > 0 ? `${score.toFixed(1)} out of 5, from ${total} ratings` : `${score.toFixed(1)} out of 5`}
    >
      <svg aria-hidden viewBox="0 0 24 24" fill="currentColor" className="size-3.5 text-[var(--color-star)]">
        <path d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.4-5.8-3-5.8 3 1.1-6.4L2.6 9.3l6.5-.9z" />
      </svg>
      {score.toFixed(1)}
      {total > 0 && <span className="font-semibold text-[var(--color-muted)]">({total})</span>}
    </span>
  )
}
