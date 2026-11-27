import type { Category } from '@place-map/shared'
import { CategoryIcon } from './category-icon'

/**
 * What a place without a photo shows in its photo's frame.
 *
 * It used to be the bare grey frame with a small icon in it, and with two of
 * three places unphotographed the list read as images that had failed to
 * load. Listing products answer this with one designed fallback, used the
 * same way on every card and in the same frame as a real photo: here, a soft
 * terracotta glow fading into sand (to transparent, so it never turns
 * muddy), a faint dot grid, and the category's icon on a cream disc ringed
 * in terracotta - so an unphotographed cafe still looks
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
          'radial-gradient(ellipse 80% 70% at 50% 45%, color-mix(in oklab, var(--color-accent) var(--hero-glow, 13%), transparent), transparent 75%), linear-gradient(var(--color-tint-soft), var(--color-tint-soft))',
      }}
    >
      <div className="dot-texture pointer-events-none absolute inset-0 opacity-70" />
      <span className="relative flex size-20 items-center justify-center rounded-full bg-[var(--color-surface)] text-[var(--color-accent)] shadow-[var(--shadow-md)] ring-1 ring-[var(--color-accent)]/15 ring-offset-4 ring-offset-transparent">
        <CategoryIcon category={category} size={34} />
      </span>
    </div>
  )
}
