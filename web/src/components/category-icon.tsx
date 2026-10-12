import type { Category } from '@place-map/shared'
import { Glyph, hasGlyph } from './icons'

/**
 * A category's picture, drawn icon or emoji - in that order.
 *
 * Every surface that shows a category goes through this, so an uploaded icon
 * appears everywhere at once and nowhere has to remember the fallback.
 *
 * Three sources, the same order the amenity chips use:
 *
 * 1. An icon uploaded in the dashboard. Choosing one is deliberate, so it
 *    beats everything.
 * 2. One of the brand set's drawings, when the slug has one. These are the
 *    sheet's icons: one line weight, one grid, and they take the surrounding
 *    text colour, so a row of categories reads as a set.
 * 3. The emoji. Still the fallback, and still what a new category gets until
 *    somebody draws it - emoji render differently on every platform, which is
 *    exactly why they are last.
 */
export function CategoryIcon({
  category,
  size,
  className = '',
}: {
  /** `slug` chooses the drawing; the other two are the fallbacks. */
  category: Pick<Category, 'slug' | 'icon' | 'icon_image'>
  /** Pixel size of the square. */
  size: number
  className?: string
}) {
  if (category.icon_image) {
    return (
      // Straight from ImageKit, already 256px WebP under 40 KB.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={category.icon_image}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        className={`shrink-0 rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    )
  }

  if (hasGlyph(category.slug)) {
    return <Glyph name={category.slug} size={size} className={className} />
  }

  return (
    <span aria-hidden className={className} style={{ fontSize: Math.round(size * 0.82), lineHeight: 1 }}>
      {category.icon ?? '📍'}
    </span>
  )
}
