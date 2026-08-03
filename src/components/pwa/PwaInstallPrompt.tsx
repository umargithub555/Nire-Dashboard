'use client'
import { useMemo, useState } from 'react'
import { Download, Share2, Smartphone, Menu, Plus, ChevronDown } from 'lucide-react'
import { usePwaInstall } from '@/hooks/usePwaInstall'

// ── Browser / OS detection ────────────────────────────────────────────────────

function getUA(): string {
  return typeof navigator !== 'undefined' ? navigator.userAgent : ''
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(getUA())
}

/** Chrome on Android (includes Samsung-based Chrome variants) */
function isChromeMobile(): boolean {
  const ua = getUA()
  return /Android/i.test(ua) && /Chrome\/\d/i.test(ua) && !/EdgA|OPR|SamsungBrowser/i.test(ua)
}

/** Samsung Internet */
function isSamsungBrowser(): boolean {
  return /SamsungBrowser/i.test(getUA())
}

/** Firefox on Android */
function isFirefoxMobile(): boolean {
  return /Android/i.test(getUA()) && /Firefox\/\d/i.test(getUA())
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PwaInstallPrompt() {
  const { deferredPrompt, dismissed, installed, installing, handleInstall, handleDismiss } =
    usePwaInstall()

  const [showSteps, setShowSteps] = useState(false)

  const ios = useMemo(() => isIos(), [])
  const chromeMobile = useMemo(() => isChromeMobile(), [])
  const samsung = useMemo(() => isSamsungBrowser(), [])
  const firefox = useMemo(() => isFirefoxMobile(), [])

  if (installed || dismissed) return null

  // ── 1. Native Android install prompt (Chrome/Edge fires beforeinstallprompt)
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
              Get faster access from your home screen and use it like a native app — no browser
              needed.
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

  // ── 2. iOS Safari — no native prompt, manual steps required
  if (ios) {
    return (
      <div className="mb-6 rounded-3xl border border-amber-200 bg-white/95 p-4 lg:p-5 shadow-[0_20px_60px_-35px_rgba(245,158,11,0.35)]">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <Share2 size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-zinc-900">Install on iPhone / iPad</div>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              Tap the <span className="font-semibold text-zinc-700">Share ↑</span> button at the
              bottom of Safari, then choose{' '}
              <span className="font-semibold text-zinc-700">Add to Home Screen</span>.
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

  // ── 3. Chrome / Samsung / Firefox on Android — browser already dismissed
  //        the native prompt or throttled it. Show manual step-by-step guide.
  if (chromeMobile || samsung || firefox) {
    const steps = chromeMobile || samsung
      ? [
          { icon: <Menu size={15} />, text: 'Tap the ⋮ menu at the top-right of Chrome' },
          { icon: <Plus size={15} />, text: 'Tap "Add to Home screen"' },
          { icon: <Download size={15} />, text: 'Tap "Add" to confirm' },
        ]
      : [
          { icon: <Menu size={15} />, text: 'Tap the ⋮ menu at the top-right of Firefox' },
          { icon: <Plus size={15} />, text: 'Tap "Install"' },
          { icon: <Download size={15} />, text: 'Tap "Add" to confirm' },
        ]

    return (
      <div className="mb-6 rounded-3xl border border-blue-100 bg-white/95 p-4 lg:p-5 shadow-[0_20px_60px_-35px_rgba(37,99,235,0.3)]">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
            <Smartphone size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-zinc-900">Add Nire to your home screen</div>
            <p className="mt-1 text-sm leading-5 text-zinc-500">
              Install Nire for a faster, full-screen experience — no browser bar.
            </p>

            <button
              type="button"
              onClick={() => setShowSteps((s) => !s)}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600"
            >
              <ChevronDown
                size={15}
                className={`transition-transform ${showSteps ? 'rotate-180' : ''}`}
              />
              {showSteps ? 'Hide steps' : 'How to install'}
            </button>

            {showSteps && (
              <ol className="mt-3 space-y-2">
                {steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-600">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-semibold">
                      {i + 1}
                    </span>
                    <span>{step.text}</span>
                  </li>
                ))}
              </ol>
            )}

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

  // ── 4. Other / unknown browser — generic fallback
  return (
    <div className="mb-6 rounded-3xl border border-zinc-200 bg-white/95 p-4 lg:p-5 shadow-[0_20px_60px_-35px_rgba(24,24,27,0.2)]">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700">
          <Smartphone size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-zinc-900">Install Nire</div>
          <p className="mt-1 text-sm leading-6 text-zinc-500">
            Use your browser&rsquo;s menu and select{' '}
            <span className="font-medium text-zinc-700">&ldquo;Add to Home Screen&rdquo;</span> to
            install Nire.
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
