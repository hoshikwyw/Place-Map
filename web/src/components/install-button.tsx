'use client'

import { useEffect, useState } from 'react'
import { t, type Locale } from '@/lib/i18n'

/**
 * Offers to install the site as an app.
 *
 * Only appears when the browser says it can: Chrome and the Android browsers
 * fire `beforeinstallprompt`, iOS Safari never does and installs through its
 * own Share menu instead. Rendering a button that would do nothing on iPhone
 * is worse than rendering none, so this stays hidden there - and nothing is
 * shown at all once the app is already installed.
 */

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallButton({ locale, className }: { locale: Locale; className?: string }) {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null)

  useEffect(() => {
    const onPrompt = (event: Event) => {
      // Stops the browser's own mini-infobar; the offer is made here instead,
      // beside the explanation of what installing gets you.
      event.preventDefault()
      setPrompt(event as InstallPromptEvent)
    }

    // Already installed: the offer is over.
    const onInstalled = () => setPrompt(null)

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (!prompt) return null

  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        await prompt.prompt()
        // One prompt per event, whichever they chose: keeping the button after
        // a dismissal just offers something that will not open again.
        setPrompt(null)
      }}
    >
      {t(locale).installAction}
    </button>
  )
}
