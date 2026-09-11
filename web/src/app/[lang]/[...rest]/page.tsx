import { notFound } from 'next/navigation'

/**
 * Catches every unmatched path under a locale so it renders [lang]/not-found
 * inside the site's layout. Without it, Next falls back to a bare 404 that has
 * no root layout to sit in, because the root layout lives under [lang].
 */
export default function CatchAll() {
  notFound()
}
