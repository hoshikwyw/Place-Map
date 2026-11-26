'use client'

import { useParams } from 'next/navigation'
import type { ReactNode } from 'react'
import { DEFAULT_LOCALE, isLocale, t } from '@/lib/i18n'

/**
 * Placeholders shown by the routes' loading.tsx files while a page renders.
 *
 * Every page reads the theme cookie in the layout, so every page renders on
 * request; when the API is slow to answer, a tap on a card used to change
 * nothing on screen until the whole next page was ready - which reads as a
 * tap that missed. These answer the tap at once, in the shape of the page
 * that is coming, so it lands without everything jumping.
 *
 * The shapes copy the real pages' sizes (the card's 16:10 photo, the map's
 * 70vh) - a skeleton that does not match is a layout shift on arrival, which
 * is the thing it exists to prevent.
 *
 * A client component only for useParams: loading.tsx gets no params, and the
 * one sentence a screen reader hears should be in the page's language.
 */
export function Loading({ children }: { children: ReactNode }) {
  const params = useParams<{ lang?: string }>()
  const locale = params.lang && isLocale(params.lang) ? params.lang : DEFAULT_LOCALE

  return (
    // role=status: announced once, politely, without moving focus. The shapes
    // themselves are hidden from assistive tech - grey boxes have nothing to
    // say, and a dozen of them would each be read out as an empty group.
    <div role="status" aria-busy="true">
      <span className="sr-only">{t(locale).loading}</span>
      <div aria-hidden className="animate-pulse">
        {children}
      </div>
    </div>
  )
}

/** One grey shape. Width and height come from the caller's classes. */
export function Bone({ className = '' }: { className?: string }) {
  return <div className={`rounded-md bg-[var(--color-line)]/70 ${className}`} />
}

/** A place card's outline: the same border, photo ratio and text rows. */
export function CardBone() {
  return (
    <li className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)]">
      <Bone className="aspect-[16/10] rounded-none" />
      <div className="space-y-2.5 p-4">
        <Bone className="h-5 w-3/4" />
        <Bone className="h-4 w-1/2" />
        <Bone className="mt-4 h-7 w-24 rounded-full" />
      </div>
    </li>
  )
}

/** A heading, a line under it, and a page of cards - home, category, search. */
export function GridBone({ cards = 6 }: { cards?: number }) {
  return (
    <>
      <Bone className="mb-3 h-8 w-56" />
      <Bone className="mb-8 h-4 w-32" />
      <div className="mb-8 flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }, (_, i) => (
          <Bone key={i} className="h-11 w-28 shrink-0 rounded-full" />
        ))}
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cards }, (_, i) => (
          <CardBone key={i} />
        ))}
      </ul>
    </>
  )
}
