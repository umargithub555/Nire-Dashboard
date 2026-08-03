'use client'
import { useMemo } from 'react'
import { Download, Share2, Smartphone } from 'lucide-react'
import { usePwaInstall } from '@/hooks/usePwaInstall'

function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export default function PwaInstallPrompt() {
  const { deferredPrompt, dismissed, installed, installing, handleInstall, handleDismiss } =
    usePwaInstall()

  const ios = useMemo(() => isIosDevice(), [])

  // Don't show anything if the user already installed the PWA or dismissed the banner
  if (installed || dismissed) return null

  // Android / Chrome / Edge — native install prompt is available
  if (deferredPrompt) {
    return (
      <div className="mb-6 rounded-3xl border border-emerald-200 bg-white/95 p-4 lg:p-5 shadow-[0_20px_60px_-35px_rgba(16,185,129,0.5)]">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <Download size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-zinc-900">Install Nire on this device</div>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              Get faster access from your home screen and launch the app like a native app.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleInstall}
                disabled={installing}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
              >
                <Download size={16} />
                {installing ? 'Preparing…' : 'Install app'}
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="inline-flex items-center rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // iOS — native prompt is not supported; show manual instructions
  if (ios) {
    return (
      <div className="mb-6 rounded-3xl border border-amber-200 bg-white/95 p-4 lg:p-5 shadow-[0_20px_60px_-35px_rgba(245,158,11,0.35)]">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <Share2 size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-zinc-900">Install on iPhone or iPad</div>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              Tap the{' '}
              <span className="font-medium text-zinc-700">Share</span> button in your browser, then
              choose{' '}
              <span className="font-medium text-zinc-700">Add to Home Screen</span> to install Nire.
            </p>
            <button
              type="button"
              onClick={handleDismiss}
              className="mt-4 inline-flex items-center rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Other browsers — generic instructions
  return (
    <div className="mb-6 rounded-3xl border border-zinc-200 bg-white/95 p-4 lg:p-5 shadow-[0_20px_60px_-35px_rgba(24,24,27,0.2)]">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700">
          <Smartphone size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-zinc-900">Install Nire</div>
          <p className="mt-1 text-sm leading-6 text-zinc-500">
            If your browser supports app installs, use the browser menu to install Nire to your
            home screen.
          </p>
          <button
            type="button"
            onClick={handleDismiss}
            className="mt-4 inline-flex items-center rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
