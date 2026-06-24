import PortalSidebar from '@/components/portal/PortalSidebar'
import PortalMobileHeader from '@/components/portal/PortalMobileHeader'
import PortalMobileNav from '@/components/portal/PortalMobileNav'
import { Toaster } from 'react-hot-toast'

export default function PortalAuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-zinc-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 h-screen sticky top-0 bg-white border-r border-zinc-200 flex-col">
        <PortalSidebar />
      </aside>

      {/* Mobile header with drawer */}
      <PortalMobileHeader />

      {/* Main content */}
      <main
        className="flex-1 min-w-0 p-4 lg:p-8
          pt-[calc(3.5rem+1rem)] lg:pt-8
          pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-8"
      >
        {children}
      </main>

      {/* Mobile bottom nav */}
      <PortalMobileNav />

      <Toaster position="top-right" />
    </div>
  )
}