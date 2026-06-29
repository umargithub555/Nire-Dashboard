'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, ClipboardCheck, MapPin, Receipt, User, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

const nav = [
  { href: '/portal',            label: 'Overview',   icon: LayoutDashboard },
  { href: '/portal/attendance', label: 'Attendance', icon: ClipboardCheck },
  { href: '/portal/visits',     label: 'Visits',     icon: MapPin },
  { href: '/portal/expenses',   label: 'Expenses',   icon: Receipt },
  { href: '/portal/profile',    label: 'My profile', icon: User },
]

interface PortalSidebarProps {
  onClose?: () => void
}

export default function PortalSidebar({ onClose }: PortalSidebarProps = {}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [name, setName] = useState('')
  const [branch, setBranch] = useState('')

  useEffect(() => {
    fetch('/api/portal/me').then(r => r.json()).then(d => {
      if (d.full_name) setName(d.full_name)
      if (d.branch?.name) setBranch(d.branch.name)
    })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/portal/login')
  }

  return (
    <aside className="flex flex-col h-full">
      {/* Logo — desktop only */}
      <div className="hidden lg:flex h-16 items-center px-5 border-b border-zinc-100 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <span className="font-semibold text-zinc-900">My Portal</span>
        </div>
      </div>

      {name && (
        <div className="px-4 py-3 border-b border-zinc-100 shrink-0">
          <div className="text-sm font-medium text-zinc-800 truncate">{name}</div>
          {branch && <div className="text-xs text-zinc-400 mt-0.5">{branch}</div>}
        </div>
      )}

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = href === '/portal' ? pathname === '/portal' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-zinc-100 shrink-0">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors w-full text-left"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  )
}