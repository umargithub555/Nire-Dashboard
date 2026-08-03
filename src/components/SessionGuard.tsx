'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'

const SESSION_DURATION_MINUTES = 30
const authPages = new Set([
  '/app',
  '/login',
  '/forgot-password',
  '/reset-password',
  '/portal/login',
  '/portal/forgot-password',
  '/portal/reset-password',
])

export default function SessionGuard() {
  const supabase = createClient()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (authPages.has(pathname)) return

    async function validateSessionAndRole() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) return

      const isPortal = pathname.startsWith('/portal')
      const isAdminArea = !isPortal

      const portalProfileRes = await fetch('/api/portal/me', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      })

      if (isPortal && !portalProfileRes.ok) {
        router.replace('/login')
        return
      }

      if (isAdminArea && portalProfileRes.ok) {
        router.replace('/portal')
        return
      }

      const loginTime = session.user.last_sign_in_at
      if (!loginTime) return

      const minutesSinceLogin = (Date.now() - new Date(loginTime).getTime()) / (1000 * 60)

      if (minutesSinceLogin > SESSION_DURATION_MINUTES) {
        await supabase.auth.signOut()
        router.replace(isPortal ? '/portal/login' : '/login')
      }
    }

    void validateSessionAndRole()

    const handlePageShow = () => {
      void validateSessionAndRole()
    }

    const handleFocus = () => {
      void validateSessionAndRole()
    }

    window.addEventListener('pageshow', handlePageShow)
    window.addEventListener('focus', handleFocus)

    return () => {
      window.removeEventListener('pageshow', handlePageShow)
      window.removeEventListener('focus', handleFocus)
    }
  }, [pathname, router, supabase.auth])

  return null
}
