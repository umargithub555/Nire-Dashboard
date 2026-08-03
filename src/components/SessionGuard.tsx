'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'

const SESSION_DURATION_MINUTES = 30
const authPages = new Set([
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
    const isPortal = pathname.startsWith('/portal')
    if (authPages.has(pathname)) return

    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return

      const loginTime = session.user.last_sign_in_at
      if (!loginTime) return

      const minutesSinceLogin = (Date.now() - new Date(loginTime).getTime()) / (1000 * 60)

      if (minutesSinceLogin > SESSION_DURATION_MINUTES) {
        await supabase.auth.signOut()
        router.push(isPortal ? '/portal/login' : '/login')
      }
    }

    void checkSession()
  }, [pathname, router, supabase.auth])

  return null
}
