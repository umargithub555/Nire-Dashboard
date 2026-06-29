'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'

const SESSION_DURATION_MINUTES = 5  // ← change this for testing, e.g. 2 minutes

export default function SessionGuard() {
  const supabase = createClient()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const isPortal = pathname.startsWith('/portal')
    const isLoginPage = pathname === '/login' || pathname === '/portal/login'
    if (isLoginPage) return

    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const loginTime = session.user.last_sign_in_at
    //   console.log(loginTime)
      if (!loginTime) return

      const minutesSinceLogin = (Date.now() - new Date(loginTime).getTime()) / (1000 * 60)

      if (minutesSinceLogin > SESSION_DURATION_MINUTES) {
        await supabase.auth.signOut()
        router.push(isPortal ? '/portal/login' : '/login')
      }
    }

    checkSession()
  }, [pathname])

  return null
}