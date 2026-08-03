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
// Dismiss expires after 3 days so users see the banner again on next visit
const DISMISS_TTL_MS = 3 * 24 * 60 * 60 * 1000

function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY)
    if (!raw) return false
    const { ts } = JSON.parse(raw) as { ts: number }
    if (Date.now() - ts > DISMISS_TTL_MS) {
      localStorage.removeItem(DISMISSED_KEY)
      return false
    }
    return true
  } catch {
    // localStorage blocked (private browsing) or parse error — treat as not dismissed
    return false
  }
}

function saveDismiss(): void {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify({ ts: Date.now() }))
  } catch {
    // ignore
  }
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredPromptEvent | null>(null)
  const [dismissed, setDismissedState] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [installing, setInstalling] = useState(false)
  /**
   * true  → SW just activated for the first time this session;
   *          Chrome hasn't evaluated installability yet.
   *          The user should reload to get the native install option.
   * false → SW was already in control before this page load (normal state).
   */
  const [swJustActivated, setSwJustActivated] = useState(false)

  useEffect(() => {
    // Running as installed PWA — nothing to show
    if (isStandaloneMode()) {
      setInstalled(true)
      return
    }

    // Restore timed-out-aware dismissed flag
    if (isDismissed()) {
      setDismissedState(true)
      return
    }

    // Pick up prompt stashed by the inline <script> in <head>
    if (window.__pwaPrompt) {
      setDeferredPrompt(window.__pwaPrompt)
    }

    // SW just activated → Chrome will evaluate installability after a reload
    const handleSwControlled = () => setSwJustActivated(true)

    // Native event (safety net + fires again after reload)
    const handleNative = (e: Event) => {
      e.preventDefault()
      setSwJustActivated(false)
      setDeferredPrompt(e as DeferredPromptEvent)
    }

    // Custom event dispatched by the inline script / SwRegister
    const handleReady = (e: Event) => {
      const prompt = (e as CustomEvent<DeferredPromptEvent>).detail ?? window.__pwaPrompt
      if (prompt) {
        setSwJustActivated(false)
        setDeferredPrompt(prompt)
      }
    }

    const handleAppInstalled = () => {
      setInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('sw-controlled', handleSwControlled)
    window.addEventListener('beforeinstallprompt', handleNative)
    window.addEventListener('pwa-prompt-ready', handleReady)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('sw-controlled', handleSwControlled)
      window.removeEventListener('beforeinstallprompt', handleNative)
      window.removeEventListener('pwa-prompt-ready', handleReady)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return
    setInstalling(true)
    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') setInstalled(true)
    } finally {
      setDeferredPrompt(null)
      setInstalling(false)
      try { delete window.__pwaPrompt } catch { /* ignore */ }
    }
  }, [deferredPrompt])

  const handleDismiss = useCallback(() => {
    saveDismiss()
    setDismissedState(true)
  }, [])

  return {
    deferredPrompt,
    dismissed,
    installed,
    installing,
    swJustActivated,
    handleInstall,
    handleDismiss,
  }
}
