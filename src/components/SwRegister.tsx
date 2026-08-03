'use client'
import { useEffect } from 'react'

/**
 * SwRegister is mounted in the root layout so it runs on every page.
 *
 * It does two things:
 *  1. Registers the service worker on production so the PWA criteria are met.
 *  2. Captures the `beforeinstallprompt` event early and stores it on
 *     `window.__pwaPrompt` so that PwaInstallPrompt (which may mount later)
 *     can always retrieve it, even if the event fired before the component
 *     appeared in the tree.
 */
export default function SwRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    // ── Capture beforeinstallprompt as early as possible ──────────────────
    // Store the event globally so any component can retrieve it regardless
    // of when it mounts relative to when the browser fires the event.
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      ;(window as Window & { __pwaPrompt?: Event }).__pwaPrompt = e
      // Dispatch a custom event so any already-mounted listeners are notified
      window.dispatchEvent(new CustomEvent('pwa-prompt-ready', { detail: e }))
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // ── Service Worker registration ────────────────────────────────────────
    if ('serviceWorker' in navigator) {
      if (process.env.NODE_ENV === 'development') {
        // In development unregister any stale service worker to prevent
        // caching and HMR conflicts.
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const reg of registrations) {
            reg.unregister().then((ok) => {
              if (ok) console.log('[SW] Unregistered dev service worker')
            })
          }
        })
        return
      }

      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => console.log('[SW] Registered', reg.scope))
        .catch((err) => console.error('[SW] Registration failed', err))
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  return null
}
