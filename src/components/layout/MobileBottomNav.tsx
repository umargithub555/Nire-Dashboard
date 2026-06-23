'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Building2, Users, ClipboardCheck, Receipt } from 'lucide-react'

const nav = [
  { href: '/',           label: 'Overview',   icon: LayoutDashboard },
  { href: '/branches',   label: 'Branches',   icon: Building2 },
  { href: '/employees',  label: 'Employees',  icon: Users },
  { href: '/attendance', label: 'Attendance', icon: ClipboardCheck },
  { href: '/expenses',   label: 'Expenses',   icon: Receipt },
]

export default function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-zinc-200"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-around">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 py-2 px-3 min-w-0 flex-1 transition-colors ${
                active ? 'text-blue-600' : 'text-zinc-400'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium truncate">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
