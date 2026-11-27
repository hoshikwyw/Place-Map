import type { Category } from '@place-map/shared'
import { CategoryIcon } from './category-icon'

/**
 * What a place without a photo shows in its photo's frame.
 *
 * It used to be the bare grey frame with a small icon in it, and with two of
 * three places unphotographed the list read as images that had failed to
 * load. Listing products answer this with one designed fallback, used the
 * same way on every card and in the same frame as a real photo: here, a warm
 * sand-to-peach wash, the hero's dot grid, and the category's icon on a
 * cream disc ringed in terracotta - so an unphotographed cafe still looks
 * like a cafe, and like it belongs on the page.
 *
 * Decoration: the card's own text names the place and its category.
 */
export function PhotoFallback({ category }: { category: Pick<Category, 'slug' | 'icon' | 'icon_image'> }) {
  return (
    <div
      aria-hidden
      className="relative flex size-full items-center justify-center"
      style={{
        backgroundImage:
          'radial-gradient(circle at 80% 10%, color-mix(in oklab, var(--color-highlight) 16%, transparent), transparent 55%), linear-gradient(160deg, var(--color-tint-soft), var(--color-accent-soft))',
      }}
    >
      <div className="dot-texture pointer-events-none absolute inset-0 opacity-70" />
      <span className="relative flex size-20 items-center justify-center rounded-full bg-[var(--color-surface)] text-[var(--color-accent)] shadow-[var(--shadow-md)] ring-1 ring-[var(--color-accent)]/15 ring-offset-4 ring-offset-transparent">
        <CategoryIcon category={category} size={34} />
      </span>
    </div>
  )
}
