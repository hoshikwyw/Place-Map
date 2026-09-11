/**
 * A pass-through root layout, on purpose.
 *
 * `<html lang>` has to come from the URL, so the layout that renders `<html>`
 * lives one level down in `[lang]/layout.tsx`. But a `notFound()` or error that
 * escapes that layout - an unknown locale, say - needs a boundary *above* it,
 * and Next only puts one there when `app/` has a layout and a not-found of its
 * own. Without this file, those requests fell through to Next's bare built-in
 * 404, outside the site's design and in English only.
 *
 * Returning `children` untouched keeps `[lang]/layout.tsx` in charge of the
 * document, and costs nothing at render time.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children
}
