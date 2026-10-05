'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { PlaceImage } from '@place-map/shared'
import { t, type Locale } from '@/lib/i18n'

/**
 * A place's photos: a swipeable strip, and a popup for looking properly.
 *
 * The strip is a scroll-snap container rather than a carousel library. A finger
 * swipe, a trackpad, the arrow buttons and the thumbnails all drive the same
 * native scrolling, which means momentum and rubber-banding feel right on a
 * phone without a dependency - and if JavaScript never arrives, the photos are
 * still all there and still scrollable.
 *
 * The popup is for detail: one photo filling the screen, arrows to move through
 * them, and a zoom that enlarges the photo inside a pannable box.
 */

export function Gallery({
  images,
  name,
  locale,
}: {
  images: PlaceImage[]
  /** The place's name, for alt text. */
  name: string
  locale: Locale
}) {
  const labels = t(locale)
  const [index, setIndex] = useState(0)
  const [open, setOpen] = useState(false)

  const stripRef = useRef<HTMLUListElement>(null)
  const openerRef = useRef<HTMLButtonElement>(null)

  const total = images.length
  const go = useCallback((next: number) => setIndex(((next % total) + total) % total), [total])

  /** Scrolls the strip so the chosen photo is the one in view. */
  const scrollTo = useCallback((next: number) => {
    const strip = stripRef.current
    const slide = strip?.children[next] as HTMLElement | undefined
    if (strip && slide) strip.scrollTo({ left: slide.offsetLeft - strip.offsetLeft, behavior: 'smooth' })
  }, [])

  const select = (next: number) => {
    go(next)
    scrollTo(((next % total) + total) % total)
  }

  // Swiping moves the strip, not the state, so read back which photo landed.
  const onScroll = () => {
    const strip = stripRef.current
    if (!strip) return
    const nearest = Math.round(strip.scrollLeft / strip.clientWidth)
    setIndex(Math.min(total - 1, Math.max(0, nearest)))
  }

  // In the popup, the arrow keys and Escape are what people reach for.
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
      if (event.key === 'ArrowRight') go(index + 1)
      if (event.key === 'ArrowLeft') go(index - 1)
    }
    document.addEventListener('keydown', onKey)

    // The page behind must not scroll while a full-screen photo is open.
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, index, go])

  const close = () => {
    setOpen(false)
    openerRef.current?.focus()
    scrollTo(index)
  }

  if (total === 0) return null

  const arrow =
    'flex size-10 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink)] shadow-md transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-40'

  return (
    <section aria-label={labels.photos} className="mb-8">
      <div className="relative">
        <ul
          ref={stripRef}
          onScroll={onScroll}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-xl bg-[var(--color-tint-soft)]"
        >
          {images.map((image, position) => (
            <li key={image.url} className="w-full shrink-0 snap-center">
              <button
                ref={position === 0 ? openerRef : undefined}
                type="button"
                onClick={() => setOpen(true)}
                aria-label={`${labels.photos}: ${labels.photoCounter(position + 1, total)}`}
                className="block w-full cursor-zoom-in"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt={position === 0 ? name : ''}
                  width={image.width ?? undefined}
                  height={image.height ?? undefined}
                  // The first photo is the largest thing on the page.
                  fetchPriority={position === 0 ? 'high' : 'auto'}
                  loading={position === 0 ? 'eager' : 'lazy'}
                  className="max-h-[28rem] w-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>

        {total > 1 && (
          <>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-3">
              <button
                type="button"
                onClick={() => select(index - 1)}
                aria-label={labels.previous}
                className={`pointer-events-auto ${arrow}`}
              >
                <Chevron direction="left" />
              </button>
              <button
                type="button"
                onClick={() => select(index + 1)}
                aria-label={labels.next}
                className={`pointer-events-auto ${arrow}`}
              >
                <Chevron direction="right" />
              </button>
            </div>

            <p className="absolute bottom-3 right-3 rounded-full bg-[var(--color-ink)]/70 px-3 py-1 text-sm font-bold text-[var(--color-surface)]">
              {labels.photoCounter(index + 1, total)}
            </p>
          </>
        )}
      </div>

      {total > 1 && (
        <ul className="no-scrollbar mt-2 flex gap-2 overflow-x-auto py-1">
          {images.map((image, position) => (
            <li key={image.url} className="shrink-0">
              <button
                type="button"
                onClick={() => select(position)}
                aria-label={labels.photoCounter(position + 1, total)}
                aria-current={position === index ? 'true' : undefined}
                className={`block overflow-hidden rounded-md border-2 transition ${
                  position === index
                    ? 'border-[var(--color-accent)]'
                    : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt="" loading="lazy" className="h-20 w-28 object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <Lightbox
          images={images}
          index={index}
          name={name}
          labels={labels}
          onClose={close}
          onPrevious={() => go(index - 1)}
          onNext={() => go(index + 1)}
        />
      )}
    </section>
  )
}

function Lightbox({
  images,
  index,
  name,
  labels,
  onClose,
  onPrevious,
  onNext,
}: {
  images: PlaceImage[]
  index: number
  name: string
  labels: ReturnType<typeof t>
  onClose: () => void
  onPrevious: () => void
  onNext: () => void
}) {
  const [zoomed, setZoomed] = useState(false)
  const image = images[index]!
  const total = images.length

  // Each photo starts unzoomed, or moving on would land mid-zoom somewhere
  // unrelated to what the last photo was showing.
  useEffect(() => setZoomed(false), [index])

  const control =
    'flex size-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={labels.photos}
      // The backdrop closes it, as every photo viewer does.
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col bg-black/90"
    >
      <div className="flex items-center justify-between gap-3 p-3 text-white" onClick={(e) => e.stopPropagation()}>
        <p className="px-2 text-sm font-bold">{labels.photoCounter(index + 1, total)}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(event) => {
            // Without this the click reaches the backdrop and closes the popup
            // instead of zooming.
            event.stopPropagation()
            setZoomed((value) => !value)
          }}
            aria-label={zoomed ? labels.zoomOut : labels.zoomIn}
            aria-pressed={zoomed}
            className={control}
          >
            <Magnifier zoomed={zoomed} />
          </button>
          <button type="button" onClick={onClose} aria-label={labels.close} className={control}>
            <span aria-hidden className="text-2xl leading-none">
              ×
            </span>
          </button>
        </div>
      </div>

      {/* Zoomed, the box scrolls so the photo can be panned around. */}
      <div className={`flex flex-1 items-center justify-center p-2 sm:p-6 ${zoomed ? 'overflow-auto' : 'overflow-hidden'}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.url}
          alt={name}
          onClick={() => setZoomed((value) => !value)}
          className={
            zoomed
              ? 'max-w-none cursor-zoom-out'
              : 'max-h-full max-w-full cursor-zoom-in object-contain'
          }
          style={zoomed ? { width: '180%' } : undefined}
        />
      </div>

      {total > 1 && (
        <div className="flex items-center justify-center gap-4 p-4" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={onPrevious} aria-label={labels.previous} className={control}>
            <Chevron direction="left" />
          </button>
          <button type="button" onClick={onNext} aria-label={labels.next} className={control}>
            <Chevron direction="right" />
          </button>
        </div>
      )}
    </div>
  )
}

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
    >
      <path d={direction === 'left' ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} />
    </svg>
  )
}

function Magnifier({ zoomed }: { zoomed: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
      <path d={zoomed ? 'M8 11h6' : 'M8 11h6M11 8v6'} />
    </svg>
  )
}
