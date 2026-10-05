'use client'

import Link from 'next/link'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { AssistantResult, NearbyPlace } from '@place-map/shared'
import { t, type Locale } from '@/lib/i18n'
import { CategoryIcon } from './category-icon'
import { Logo } from './logo'
import { OpenNow } from './open-now'

/**
 * The chat-style place finder: "cafe near me" in, a reply and places out.
 *
 * All the understanding happens in the API (GET /v1/assistant), so the app and
 * the website answer the same way. This component only holds the conversation
 * and, when the API says `needs_location`, asks the browser for the visitor's
 * position and sends the same message again with it.
 *
 * It lives in the locale layout, so the conversation survives navigating
 * between pages. The location is kept in memory for the visit only - never
 * stored - and is asked for only when a message needs it.
 */

const API_URL = process.env.PLACE_MAP_PUBLIC_API_URL ?? ''
const TIMEOUT_MS = 15_000

interface Point {
  lat: number
  lng: number
}

type Message =
  | { id: number; role: 'user'; text: string }
  | {
      id: number
      role: 'assistant'
      text: string
      places?: NearbyPlace[]
      /** Offer "Share my location" and resend this query with it. */
      askLocation?: string
      /** Offer "Try again" for this query. */
      retry?: string
      note?: string
    }

/** A message before it has an id. Omit on each member, so each keeps its own fields. */
type NewMessage = Message extends infer M ? (M extends Message ? Omit<M, 'id'> : never) : never

async function fetchReply(query: string, locale: Locale, location: Point | null): Promise<AssistantResult> {
  const params = new URLSearchParams({ q: query, lang: locale })
  if (location) {
    params.set('lat', location.lat.toFixed(5))
    params.set('lng', location.lng.toFixed(5))
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetch(`${API_URL}/v1/assistant?${params}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
    if (!response.ok) throw new Error(`assistant ${response.status}`)
    return ((await response.json()) as { data: AssistantResult }).data
  } finally {
    clearTimeout(timer)
  }
}

function currentPosition(): Promise<Point> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      reject,
      // City-level accuracy is plenty for "near me", and much faster to get.
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    )
  })
}

export function Assistant({ locale, timeZone }: { locale: Locale; timeZone: string }) {
  const text = t(locale).assistant
  const panelId = useId()

  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [locating, setLocating] = useState(false)
  const [messages, setMessages] = useState<Message[]>(() => [
    { id: 0, role: 'assistant', text: text.greeting },
  ])

  const nextId = useRef(1)
  const location = useRef<Point | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const endRef = useRef<HTMLDivElement>(null)

  const push = useCallback((message: NewMessage) => {
    setMessages((current) => [...current, { ...message, id: nextId.current++ } as Message])
  }, [])

  /** Once a button in a message has been used, it goes. */
  const settle = useCallback((id: number) => {
    setMessages((current) =>
      current.map((m) => (m.id === id && m.role === 'assistant' ? { ...m, askLocation: undefined, retry: undefined } : m)),
    )
  }, [])

  const ask = useCallback(
    async (query: string) => {
      setBusy(true)
      try {
        const result = await fetchReply(query, locale, location.current)
        push({
          role: 'assistant',
          text: result.reply,
          places: result.places,
          askLocation: result.needs_location ? query : undefined,
          note: result.needs_location ? text.locationNote : undefined,
        })
      } catch {
        push({ role: 'assistant', text: text.error, retry: query })
      } finally {
        setBusy(false)
      }
    },
    [locale, push, text.error, text.locationNote],
  )

  const send = (query: string) => {
    const trimmed = query.trim()
    if (!trimmed || busy) return
    push({ role: 'user', text: trimmed })
    setDraft('')
    void ask(trimmed)
  }

  const shareLocation = async (messageId: number, query: string) => {
    if (!('geolocation' in navigator)) {
      push({ role: 'assistant', text: text.locationUnsupported })
      return
    }
    setLocating(true)
    try {
      location.current = await currentPosition()
      settle(messageId)
      await ask(query)
    } catch (error) {
      const denied = (error as GeolocationPositionError).code === 1
      push({ role: 'assistant', text: denied ? text.locationDenied : text.locationUnavailable, askLocation: query })
      settle(messageId)
    } finally {
      setLocating(false)
    }
  }

  const retry = (messageId: number, query: string) => {
    settle(messageId)
    void ask(query)
  }

  // Focus the box on open; hand focus back to the button on close.
  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const close = useCallback(() => {
    setOpen(false)
    toggleRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, close])

  // Keep the newest message in view.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages, busy, open])

  /** On a phone the panel covers the page, so following a result closes it. */
  const onPlaceClick = () => {
    if (!window.matchMedia('(min-width: 640px)').matches) setOpen(false)
  }

  const onlyGreeting = messages.length === 1

  return (
    <>
      <button
        ref={toggleRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className={`fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] py-1.5 pl-1.5 pr-4 text-sm font-bold shadow-lg transition hover:-translate-y-0.5 hover:border-[var(--color-accent)] ${open ? 'max-sm:hidden' : ''}`}
      >
        <Logo size={36} />
        <span className="whitespace-nowrap">{open ? text.close : text.open}</span>
      </button>

      {open && (
        <section
          id={panelId}
          role="dialog"
          aria-label={text.title}
          className="fixed inset-0 z-50 flex flex-col bg-[var(--color-canvas)] sm:inset-auto sm:bottom-20 sm:right-4 sm:h-[min(640px,calc(100dvh-7rem))] sm:w-[400px] sm:overflow-hidden sm:rounded-xl sm:border sm:border-[var(--color-line)] sm:shadow-2xl"
        >
          <header className="flex items-center gap-3 border-b border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3">
            <Logo size={36} />
            <div className="min-w-0 flex-1">
              <h2 className="font-bold leading-tight">{text.title}</h2>
              <p className="truncate text-xs text-[var(--color-muted)]">{text.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label={text.close}
              className="flex size-9 items-center justify-center rounded-full text-xl text-[var(--color-muted)] transition hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-ink)]"
            >
              <span aria-hidden>×</span>
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
            {messages.map((message) =>
              message.role === 'user' ? (
                <div key={message.id} className="flex justify-end">
                  <p className="max-w-[85%] rounded-lg rounded-br-sm bg-[var(--color-accent)] px-3.5 py-2 text-sm text-[var(--color-on-accent)]">
                    <span className="sr-only">{text.you}: </span>
                    {message.text}
                  </p>
                </div>
              ) : (
                <div key={message.id} className="space-y-2">
                  <p className="max-w-[90%] rounded-lg rounded-bl-sm border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-2 text-sm">
                    {message.text}
                  </p>

                  {message.places && message.places.length > 0 && (
                    <ul className="space-y-2">
                      {message.places.map((place) => (
                        <PlaceRow
                          key={place.id}
                          place={place}
                          locale={locale}
                          timeZone={timeZone}
                          onClick={onPlaceClick}
                        />
                      ))}
                    </ul>
                  )}

                  {message.askLocation && (
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        disabled={locating || busy}
                        onClick={() => shareLocation(message.id, message.askLocation!)}
                        className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-bold text-[var(--color-on-accent)] transition hover:opacity-90 disabled:opacity-60"
                      >
                        <span aria-hidden>📍</span>
                        {locating ? text.locating : text.shareLocation}
                      </button>
                      {message.note && <p className="text-xs text-[var(--color-muted)]">{message.note}</p>}
                    </div>
                  )}

                  {message.retry && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => retry(message.id, message.retry!)}
                      className="whitespace-nowrap rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-2 text-sm font-bold transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-60"
                    >
                      {text.retry}
                    </button>
                  )}
                </div>
              ),
            )}

            {onlyGreeting && (
              <div className="flex flex-wrap gap-2">
                {text.suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => send(suggestion)}
                    className="whitespace-nowrap rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-1.5 text-sm font-semibold transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {busy && (
              <p className="inline-flex items-center gap-2 text-sm text-[var(--color-muted)]">
                <span aria-hidden className="size-2 animate-pulse rounded-full bg-[var(--color-accent)]" />
                {text.thinking}
              </p>
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault()
              send(draft)
            }}
            className="flex gap-2 border-t border-[var(--color-line)] bg-[var(--color-surface)] p-3"
          >
            <input
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={text.placeholder}
              aria-label={text.placeholder}
              maxLength={200}
              enterKeyHint="send"
              className="min-w-0 flex-1 rounded-full border border-[var(--color-line)] bg-[var(--color-canvas)] px-4 py-2 text-sm placeholder:text-[var(--color-muted)] transition focus:border-[var(--color-accent)] focus:outline-none focus:ring-4 focus:ring-[var(--color-accent-soft)]"
            />
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              className="shrink-0 whitespace-nowrap rounded-full bg-[var(--color-accent)] px-4 text-sm font-bold text-[var(--color-on-accent)] transition hover:opacity-90 disabled:opacity-50"
            >
              {text.send}
            </button>
          </form>
        </section>
      )}
    </>
  )
}

function PlaceRow({
  place,
  locale,
  timeZone,
  onClick,
}: {
  place: NearbyPlace
  locale: Locale
  timeZone: string
  onClick: () => void
}) {
  const text = t(locale).assistant

  return (
    <li>
      <Link
        href={`/${locale}/p/${place.slug}`}
        onClick={onClick}
        className="group flex gap-3 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-2 transition hover:border-[var(--color-accent)]"
      >
        <div className="size-16 shrink-0 overflow-hidden rounded-md bg-[var(--color-tint-soft)]">
          {place.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={place.image.url} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center">
              <CategoryIcon category={place.category} size={32} />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate font-bold leading-snug transition group-hover:text-[var(--color-accent)]">
            {place.name}
          </p>
          <p className="flex items-center gap-1.5 truncate text-xs text-[var(--color-muted)]">
            <CategoryIcon category={place.category} size={14} />
            {place.category.name}
            {place.distance_m !== null && (
              <span className="font-bold text-[var(--color-ink)]"> · {text.distance(place.distance_m)}</span>
            )}
          </p>
          <OpenNow hours={place.opening_hours} timeZone={timeZone} locale={locale} />
        </div>
      </Link>
    </li>
  )
}
