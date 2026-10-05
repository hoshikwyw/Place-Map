import type { Category } from '@place-map/shared'

/**
 * A category's picture if it has one, its emoji otherwise.
 *
 * Every surface that shows a category goes through this, so an uploaded icon
 * appears everywhere at once and nowhere has to remember the fallback.
 */
export function CategoryIcon({
  category,
  size,
  className = '',
}: {
  category: Pick<Category, 'icon' | 'icon_image'>
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

  return (
    <span aria-hidden className={className} style={{ fontSize: Math.round(size * 0.82), lineHeight: 1 }}>
      {category.icon ?? '📍'}
    </span>
  )
}
