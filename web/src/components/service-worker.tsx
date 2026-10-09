'use client'

import { useEffect } from 'react'

/**
 * Registers the service worker, which is what makes the site installable and
 * readable offline.
 *
 * Only in production. In development the pages change constantly and a worker
 * holding on to them is a confusing way to spend an afternoon - and `next dev`
 * does not serve the same asset URLs anyway.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    // After load: registering competes with the page's own requests, and the
    // first visit is the one that should feel fast.
    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch((error: unknown) => {
        // Not fatal - the site works exactly as before without it.
        console.warn('service worker registration failed', error)
      })
    }

    if (document.readyState === 'complete') register()
    else window.addEventListener('load', register, { once: true })

    return () => window.removeEventListener('load', register)
  }, [])

  return null
}
