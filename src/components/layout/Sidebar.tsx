'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Building2, Users, ClipboardCheck, MapPin, Receipt, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const nav = [
  { href: '/',            label: 'Overview',   icon: LayoutDashboard },
  { href: '/branches',    label: 'Branches',   icon: Building2 },
  { href: '/employees',   label: 'Employees',  icon: Users },
  { href: '/attendance',  label: 'Attendance', icon: ClipboardCheck },
  { href: '/visits',      label: 'Visits',     icon: MapPin },
  { href: '/expenses',    label: 'Expenses',   icon: Receipt },
]

interface SidebarProps {
  onClose?: () => void
}

export default function Sidebar({ onClose }: SidebarProps = {}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function handleNavClick() {
    onClose?.()
  }

  return (
    <aside className="flex flex-col h-full">
      {/* Logo — only shown when NOT in drawer (desktop sidebar has its own logo in the sticky wrapper) */}
      <div className="hidden lg:flex h-16 items-center px-5 border-b border-zinc-100 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <span className="font-semibold text-zinc-900">Nire</span>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={handleNavClick}
              className={`sidebar-link ${active ? 'active' : ''}`}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-zinc-100 shrink-0">
        <button onClick={handleLogout} className="sidebar-link w-full text-left">
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  )
}