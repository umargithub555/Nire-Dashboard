'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'

const EMPLOYEE_LOGIN_ERROR = 'This account is not allowed in the Employee Portal. Please use the admin login instead.'
const INACTIVE_LOGIN_ERROR = 'Your account is inactive. Please contact admin.'

function isStandaloneMode() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: window-controls-overlay)').matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
}

export default function PortalLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const inactiveError = searchParams.get('inactive') === '1' ? INACTIVE_LOGIN_ERROR : ''

  useEffect(() => {
    if (!isStandaloneMode()) return

    const currentUrl = new URL(window.location.href)
    const entry = currentUrl.searchParams.get('entry')

    if (entry !== 'app') {
      router.replace('/app')
      return
    }

    currentUrl.searchParams.delete('entry')
    window.history.replaceState({}, '', currentUrl.pathname + currentUrl.search)
  }, [router])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setError('Invalid email or password. Please try again.')
      setLoading(false)
      return
    }

    const profileRes = await fetch('/api/portal/me', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    })
    const profile = await profileRes.json().catch(() => null)

    if (profileRes.status === 403 && profile?.error === INACTIVE_LOGIN_ERROR) {
      await supabase.auth.signOut()
      setError(INACTIVE_LOGIN_ERROR)
      setLoading(false)
      return
    }

    if (!profileRes.ok) {
      await supabase.auth.signOut()
      setError(EMPLOYEE_LOGIN_ERROR)
      setLoading(false)
      return
    }

    router.push('/portal')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-900 mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-zinc-900">Employee Portal</h1>
          <p className="text-sm text-zinc-500 mt-1">Sign in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4">
          {(error || inactiveError) && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error || inactiveError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
              placeholder="you@company.com" required autoComplete="email" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-zinc-700">Password</label>
              <Link href="/portal/forgot-password" className="text-xs font-medium text-zinc-900 hover:text-zinc-700">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-3 pr-10 py-2.5 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors focus:outline-none"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
