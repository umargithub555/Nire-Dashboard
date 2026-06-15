import Sidebar from '@/components/layout/Sidebar'
import { Toaster } from 'react-hot-toast'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-zinc-50">
      <Sidebar />
      <main className="flex-1 min-w-0 p-8">
        {children}
      </main>
      <Toaster position="top-right" />
    </div>
  )
}