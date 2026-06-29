'use client'
import { useEffect } from 'react'

export default function SwRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      if (process.env.NODE_ENV === 'development') {
        // In development, unregister any active service worker to prevent caching/HMR conflicts
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister().then((success) => {
              if (success) console.log('[SW] Unregistered active service worker in development')
            })
          }
        })
        return
      }

      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('[SW] Registered', reg.scope))
        .catch((err) => console.error('[SW] Registration failed', err))
    }
  }, [])
  return null
}
