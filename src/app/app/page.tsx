import Link from 'next/link'
import { ArrowRight, Shield, Users } from 'lucide-react'
import PwaInstallPrompt from '@/components/pwa/PwaInstallPrompt'

export default function AppChooserPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#dbeafe_0%,_#f8fafc_38%,_#f4f4f5_100%)] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <PwaInstallPrompt />

        <div className="text-center mb-8 lg:mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200/70 mb-4">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h1 className="text-3xl lg:text-4xl font-semibold text-zinc-900">Welcome to Nire</h1>
          <p className="text-sm lg:text-base text-zinc-500 mt-2">
            Choose how you want to continue in the app.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          <Link
            href="/login?entry=app"
            className="group bg-white/95 border border-blue-100 rounded-3xl p-6 lg:p-8 shadow-[0_20px_60px_-30px_rgba(37,99,235,0.45)] hover:-translate-y-1 transition-all"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center mb-5">
              <Shield size={22} />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900">Admin Dashboard</h2>
                <p className="text-sm text-zinc-500 mt-2 leading-6">
                  Manage employees, attendance, expenses, branches, and reporting from the admin side.
                </p>
              </div>
              <ArrowRight className="text-blue-600 shrink-0 mt-1 group-hover:translate-x-1 transition-transform" size={20} />
            </div>
            <div className="mt-6 inline-flex items-center rounded-full bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1.5">
              Continue as admin
            </div>
          </Link>

          <Link
            href="/portal/login?entry=app"
            className="group bg-white/95 border border-zinc-200 rounded-3xl p-6 lg:p-8 shadow-[0_20px_60px_-30px_rgba(24,24,27,0.22)] hover:-translate-y-1 transition-all"
          >
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-white flex items-center justify-center mb-5">
              <Users size={22} />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900">Employee Portal</h2>
                <p className="text-sm text-zinc-500 mt-2 leading-6">
                  Check attendance, log visits, manage expenses, and update your profile from the portal.
                </p>
              </div>
              <ArrowRight className="text-zinc-900 shrink-0 mt-1 group-hover:translate-x-1 transition-transform" size={20} />
            </div>
            <div className="mt-6 inline-flex items-center rounded-full bg-zinc-100 text-zinc-700 text-xs font-medium px-3 py-1.5">
              Continue as employee
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
