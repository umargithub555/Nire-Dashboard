'use client'
import { useEffect } from 'react'

/**
 * SwRegister — mounted in the root layout, runs on every page.
 *
 * Responsibilities:
 *  1. Capture `beforeinstallprompt` as early as possible and stash it on
 *     `window.__pwaPrompt` so downstream components always find it regardless
 *     of mount timing.  (The inline <script> in layout.tsx catches it even
 *     earlier, before React loads at all.)
 *  2. Register the service worker in production.
 *  3. Detect when the SW takes control of the page for the first time
 *     (`controllerchange`) and dispatch `sw-controlled` so components can
 *     prompt the user to reload and let Chrome re-evaluate installability.
 */
export default function SwRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    type DeferredPromptEvent = Event & {
      prompt: () => Promise<void>
      userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
    }

    // ── Capture beforeinstallprompt (safety-net — inline script catches it
    //    even earlier, but this handles the case where the event fires after
    //    React hydrates and before this effect runs a second time).
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      const prompt = e as DeferredPromptEvent
      ;(window as Window & { __pwaPrompt?: DeferredPromptEvent }).__pwaPrompt = prompt
      window.dispatchEvent(new CustomEvent('pwa-prompt-ready', { detail: prompt }))
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // ── Service Worker ────────────────────────────────────────────────────
    if (!('serviceWorker' in navigator)) {
      return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }

    if (process.env.NODE_ENV === 'development') {
      // In development, unregister stale SWs to prevent caching / HMR issues
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => reg.unregister().then((ok) => {
          if (ok) console.log('[SW] Unregistered dev SW')
        }))
      })
      return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }

    // Production: register the SW
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        console.log('[SW] Registered', reg.scope)
      })
      .catch((err) => console.error('[SW] Registration failed', err))

    // Detect when the SW first takes control of this page.
    // Chrome will only offer "Add to Home Screen / Install" once the SW
    // is actively controlling the page.  On a brand-new install the SW
    // doesn't control the page until it activates and calls clients.claim().
    // We listen for `controllerchange` and dispatch a custom event so the
    // install banner can tell the user to reload.
    const handleControllerChange = () => {
      console.log('[SW] Now controlling the page — reload to activate install prompt')
      window.dispatchEvent(new Event('sw-controlled'))
    }
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
    }
  }, [])

  return null
}
