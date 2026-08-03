'use client'
import { useEffect, useState, useCallback } from 'react'

type DeferredPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

declare global {
  interface Window {
    __pwaPrompt?: DeferredPromptEvent
  }
}

const DISMISSED_KEY = 'nire-pwa-dismissed'

function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredPromptEvent | null>(null)
  const [dismissed, setDismissedState] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    // If already running as installed PWA, mark installed and stop
    if (isStandaloneMode()) {
      setInstalled(true)
      return
    }

    // Restore dismissed state from localStorage
    try {
      if (localStorage.getItem(DISMISSED_KEY) === 'true') {
        setDismissedState(true)
        return
      }
    } catch {
      // ignore — private browsing may block localStorage
    }

    // SwRegister (in root layout) fires before this component mounts.
    // It stores the deferred prompt on window.__pwaPrompt so we can pick it up
    // even when the event already fired before this hook ran.
    if (window.__pwaPrompt) {
      setDeferredPrompt(window.__pwaPrompt)
    }

    // Also listen for the custom event dispatched by SwRegister and the native
    // event (safety net — in case the component mounts before SwRegister's
    // listener or the event fires again).
    const handleReady = (e: Event) => {
      const prompt = (e as CustomEvent<DeferredPromptEvent>).detail ?? window.__pwaPrompt
      if (prompt) setDeferredPrompt(prompt)
    }

    const handleNative = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as DeferredPromptEvent)
    }

    const handleAppInstalled = () => {
      setInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('pwa-prompt-ready', handleReady)
    window.addEventListener('beforeinstallprompt', handleNative)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('pwa-prompt-ready', handleReady)
      window.removeEventListener('beforeinstallprompt', handleNative)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return
    setInstalling(true)
    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setInstalled(true)
      }
    } finally {
      setDeferredPrompt(null)
      setInstalling(false)
      // Clear the global reference after use
      try { delete window.__pwaPrompt } catch { /* ignore */ }
    }
  }, [deferredPrompt])

  const handleDismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISSED_KEY, 'true')
    } catch {
      // ignore
    }
    setDismissedState(true)
  }, [])

  return {
    deferredPrompt,
    dismissed,
    installed,
    installing,
    handleInstall,
    handleDismiss,
  }
}
