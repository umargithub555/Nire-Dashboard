import { Toaster } from 'react-hot-toast'

export default function PortalLoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50">
      {children}
      <Toaster position="top-right" />
    </div>
  )
}