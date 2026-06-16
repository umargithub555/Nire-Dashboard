import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import SwRegister from '@/components/SwRegister'

export const metadata: Metadata = {
  title: 'Nire — Staff Management',
  description: 'Employee tracking and management system',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Nire',
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>
        {children}
        <Toaster position="top-right" />
        <SwRegister />
      </body>
    </html>
  )
}





// export default function RootLayout({ children }: { children: React.ReactNode }) {
//   return (
//     <html lang="en" data-scroll-behavior="smooth">
//       <body>
//         {children}
//         <Toaster position="top-right" />
//         <SwRegister />
//       </body>
//     </html>
//   )
// }