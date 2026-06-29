import { Toaster } from 'react-hot-toast'

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster position="top-right" />
    </>
  )
}