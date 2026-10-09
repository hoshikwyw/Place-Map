'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Places the reader kept, stored on their own device.
 *
 * No account, because an account is a wall: most people who would save a cafe
 * will not make one, and this directory has nothing else to put behind a
 * login. The cost is that a saved list belongs to one browser on one device -
 * which is the honest trade, and the empty state says so.
 *
 * Only ids are stored. Names, hours and photos are fetched fresh, so a place
 * that was renamed or has new opening hours does not show its old self for
 * months.
 */

const KEY = 'place-map:saved'

/** Fires in the tab that made the change; `storage` covers the other tabs. */
const CHANGED = 'place-map:saved-changed'

export interface SavedEntry {
  id: number
  /** When it was saved, so the list can lead with the most recent. */
  at: number
}

/**
 * Whether anything can be stored at all.
 *
 * A private window, blocked site data or a browser with storage disabled all
 * throw on access rather than failing quietly, and a save button that forgets
 * everything is worse than no save button.
 */
export function storageWorks(): boolean {
  try {
    const probe = `${KEY}:probe`
    localStorage.setItem(probe, '1')
    localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

function read(): SavedEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    // Anything that is not a usable entry is dropped rather than throwing:
    // this is another tab's data, an older format, or something a person
    // typed into devtools.
    return parsed.flatMap((entry) => {
      if (typeof entry !== 'object' || entry === null) return []
      const { id, at } = entry as { id?: unknown; at?: unknown }
      if (typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0) return []
      return [{ id, at: typeof at === 'number' ? at : 0 }]
    })
  } catch {
    return []
  }
}

function write(entries: SavedEntry[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries))
  } catch {
    // Out of quota or storage denied. The list stays as it is in this tab
    // rather than the page breaking under someone's finger.
    return
  }
  window.dispatchEvent(new CustomEvent(CHANGED))
}

/**
 * The saved list, kept in step with the rest of the page and with other tabs.
 *
 * `ready` is false until after mount on purpose: the server has no idea what
 * this device saved, so the first paint must match the server's - empty - and
 * fill in afterwards.
 */
export function useSaved() {
  const [entries, setEntries] = useState<SavedEntry[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setEntries(read())
    setReady(true)

    const sync = () => setEntries(read())
    window.addEventListener(CHANGED, sync)
    // Another tab: the browser fires this one, never in the tab that wrote.
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(CHANGED, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const toggle = useCallback((id: number) => {
    const current = read()
    const next = current.some((entry) => entry.id === id)
      ? current.filter((entry) => entry.id !== id)
      : [{ id, at: Date.now() }, ...current]

    write(next)
    setEntries(next)
  }, [])

  const clear = useCallback(() => {
    write([])
    setEntries([])
  }, [])

  /** Most recently saved first: the one just kept is the one being looked for. */
  const ids = entries
    .slice()
    .sort((a, b) => b.at - a.at)
    .map((entry) => entry.id)

  return {
    ready,
    ids,
    count: ids.length,
    has: (id: number) => entries.some((entry) => entry.id === id),
    toggle,
    clear,
    /** Drops ids the API no longer returns - hidden or deleted places. */
    prune: (alive: number[]) => {
      const live = new Set(alive)
      const next = read().filter((entry) => live.has(entry.id))
      write(next)
      setEntries(next)
    },
  }
}
