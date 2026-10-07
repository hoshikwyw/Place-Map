import Link from 'next/link'
import { listAllPlaces, listAmenities } from '@/lib/api'
import { imageUrl } from '@/lib/image-url'
import { LOCALES } from '@/lib/form'
import { CardGrid, RecordCard } from '@/components/record-card'
import { Badge, Card, Empty, PageHeader } from '@/components/ui'

export const dynamic = 'force-dynamic'

export default async function AmenitiesPage() {
  const [amenities, places] = await Promise.all([listAmenities(), listAllPlaces()])
  const primary = LOCALES[0] ?? 'en'

  // How many places carry each slug. Worth showing here: an amenity nobody has
  // ticked is a label doing nothing, and one on forty places is not something
  // to rename casually.
  const used = new Map<string, number>()
  for (const place of places) {
    for (const slug of place.amenities ?? []) used.set(slug, (used.get(slug) ?? 0) + 1)
  }

  // Slugs on places that no longer match a row: the chips those places lose.
  const known = new Set(amenities.map((amenity) => amenity.slug))
  const orphans = [...used.keys()].filter((slug) => !known.has(slug)).sort()

  return (
    <>
      <PageHeader
        title="Amenities"
        action={
          <Link
            href="/amenities/new"
            className="rounded-full bg-[var(--color-accent)] px-5 py-2 text-sm font-bold text-[var(--color-on-accent)] transition hover:opacity-90"
          >
            New amenity
          </Link>
        }
      />

      <p className="mb-4 text-sm text-[var(--color-muted)]">
        The list a place&rsquo;s tick boxes are built from. Places store the slug, so renaming a
        slug leaves the places that used the old one without that chip.
      </p>

      {orphans.length > 0 && (
        <Card className="mb-4">
          <h2 className="mb-1 text-sm font-bold">Slugs with no amenity</h2>
          <p className="text-sm text-[var(--color-muted)]">
            {orphans.map((slug) => `${slug} (${used.get(slug)})`).join(', ')} &mdash; places carry
            these but nothing resolves them, so they show nothing. Create an amenity with that slug
            to bring them back, or untick them on the places.
          </p>
        </Card>
      )}

      {amenities.length === 0 ? (
        <Card>
          <Empty>No amenities yet. Places have nothing to tick until one exists.</Empty>
        </Card>
      ) : (
        <CardGrid>
          {amenities.map((amenity) => {
            const count = used.get(amenity.slug) ?? 0
            return (
              <li key={amenity.id}>
                <RecordCard
                  href={`/amenities/${amenity.id}`}
                  icon={amenity.icon}
                  imageUrl={imageUrl(amenity.icon_image)}
                  title={amenity.name[primary] ?? Object.values(amenity.name)[0] ?? amenity.slug}
                  detail={amenity.slug}
                  trailing={`#${amenity.sort_order}`}
                  badges={
                    <>
                      {/* Missing translations are invisible until someone
                          browses in that language. */}
                      {LOCALES.filter((locale) => !amenity.name[locale]).map((locale) => (
                        <Badge key={locale} tone="warn">
                          no {locale}
                        </Badge>
                      ))}
                      {!amenity.is_active && <Badge tone="warn">hidden</Badge>}
                      <Badge>{count === 1 ? '1 place' : `${count} places`}</Badge>
                    </>
                  }
                />
              </li>
            )
          })}
        </CardGrid>
      )}
    </>
  )
}
