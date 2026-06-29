'use client'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import PortalSidebar from './PortalSidebar'

export default function PortalMobileHeader() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      {/* Top header bar — mobile only */}
      <header
        className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-zinc-200 h-14 flex items-center px-4 gap-3"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 -ml-2 rounded-lg text-zinc-500 hover:bg-zinc-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <span className="font-semibold text-zinc-900 text-sm">My Portal</span>
        </div>
      </header>

      {/* Backdrop */}
      {drawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Slide-out drawer */}
      <div
        className={`lg:hidden fixed top-0 left-0 bottom-0 z-50 w-64 bg-white shadow-2xl flex flex-col transition-transform duration-300 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-14 px-4 border-b border-zinc-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <span className="font-semibold text-zinc-900 text-sm">My Portal</span>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 min-h-0">
          <PortalSidebar onClose={() => setDrawerOpen(false)} />
        </div>
      </div>
    </>
  )
}
