import Sidebar from '@/components/layout/Sidebar'
import MobileHeader from '@/components/layout/MobileHeader'
import MobileBottomNav from '@/components/layout/MobileBottomNav'
import { Toaster } from 'react-hot-toast'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-zinc-50">
      {/* Desktop sidebar — hidden on mobile */}
      <aside className="hidden lg:flex w-60 shrink-0 h-screen sticky top-0 bg-white border-r border-zinc-200 flex-col">
        <Sidebar />
      </aside>

      {/* Mobile header (hamburger + drawer) */}
      <MobileHeader />

      {/* Main content */}
      <main
        className="flex-1 min-w-0 p-4 lg:p-8
          pt-[calc(3.5rem+1rem)] lg:pt-8
          pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-8"
      >
        {children}
      </main>

      {/* Mobile bottom tab bar */}
      <MobileBottomNav />

      <Toaster position="top-right" />
    </div>
  )
}