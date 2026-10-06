/**
 * Where the chosen theme lives, shared by the server and the browser.
 *
 * Deliberately a plain module: the layout (a server component) and the toggle
 * (a client one) both need these, and a constant exported from a 'use client'
 * file is awkward to import on the server.
 *
 * Two stores, on purpose:
 *
 *  - a cookie, because the server has to know the choice to put `data-theme`
 *    into the HTML it sends. Without that the attribute can only be added by
 *    script after the first paint, and any navigation that rebuilds <html> -
 *    changing language does - shows one frame of the device's theme first.
 *  - localStorage, because the pre-paint script reads it synchronously, which
 *    still covers the very first visit of a browser that has the choice from
 *    before cookies were used.
 */

export type ThemeChoice = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'place-map-theme'
export const THEME_COOKIE = 'place-map-theme'

/** A year: long enough that a returning visitor keeps their choice. */
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return value === 'light' || value === 'dark'
}

/**
 * Inlined into <head>. The cookie usually means the server already wrote
 * `data-theme`, so this only has to cover the first load after a choice was
 * made in a browser that had no cookie yet. Dependency-free, and a failure
 * (private mode, storage blocked) leaves the device theme in place.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if((t==='dark'||t==='light')&&document.documentElement.dataset.theme!==t){document.documentElement.dataset.theme=t}}catch(e){}})()`
