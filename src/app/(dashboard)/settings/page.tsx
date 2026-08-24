'use client'

import { useEffect, useState } from 'react'

interface TrackingPolicy {
  sample_interval_minutes: number
  office_start_time: string
  office_end_time: string
  timezone: string
  stale_threshold_minutes: number
  offline_threshold_minutes: number
}

const DEFAULT_POLICY: TrackingPolicy = {
  sample_interval_minutes: 5,
  office_start_time: '09:00',
  office_end_time: '17:00',
  timezone: 'Asia/Karachi',
  stale_threshold_minutes: 15,
  offline_threshold_minutes: 30,
}

export default function SettingsPage() {
  const [policy, setPolicy] = useState<TrackingPolicy>(DEFAULT_POLICY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchPolicy()
  }, [])

  async function fetchPolicy() {
    try {
      const res = await fetch('/api/settings/tracking-policy')
      if (res.ok) {
        const data = await res.json()
        if (data.policy) {
          setPolicy(data.policy)
        }
      }
    } catch (err) {
      console.error('Failed to load tracking policy:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch('/api/settings/tracking-policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(policy),
      })

      if (res.ok) {
        setMessage({ type: 'success', text: 'Settings updated successfully.' })
      } else {
        const error = await res.json()
        setMessage({ type: 'error', text: error.message || 'Failed to update settings.' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An unexpected error occurred.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">System Settings</h1>
        <p className="text-sm text-slate-500">Configure default tracking thresholds and global preferences.</p>
      </div>

      {message && (
        <div
          className={`rounded-md p-4 text-sm ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Branch Shift Hours Notice */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Shift Schedules</h2>
          <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-800 border border-blue-200">
            <p className="font-semibold mb-1">⏰ Branch-Level Working Hours</p>
            <p>
              Shift start and end times are configured per branch (e.g. Islamabad, Peshawar). 
              Please navigate to the <a href="/branches" className="underline font-semibold text-blue-900">Branches</a> page to view or modify branch working hours.
            </p>
          </div>
        </div>

        {/* Global Thresholds */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-3">Tracking & Status Thresholds</h2>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Sample Interval (Minutes)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={policy.sample_interval_minutes}
                onChange={(e) => setPolicy({ ...policy, sample_interval_minutes: parseInt(e.target.value) || 5 })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <p className="mt-1 text-xs text-slate-500">Frequency of location updates during active hours.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Default Timezone
              </label>
              <input
                type="text"
                value={policy.timezone}
                onChange={(e) => setPolicy({ ...policy, timezone: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <p className="mt-1 text-xs text-slate-500">Fallback timezone for shift calculation (e.g. Asia/Karachi).</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Stale Threshold (Minutes)
              </label>
              <input
                type="number"
                min="5"
                max="120"
                value={policy.stale_threshold_minutes}
                onChange={(e) => setPolicy({ ...policy, stale_threshold_minutes: parseInt(e.target.value) || 15 })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <p className="mt-1 text-xs text-slate-500">Time after which a device is flagged as 'Stale'.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Offline Threshold (Minutes)
              </label>
              <input
                type="number"
                min="10"
                max="240"
                value={policy.offline_threshold_minutes}
                onChange={(e) => setPolicy({ ...policy, offline_threshold_minutes: parseInt(e.target.value) || 30 })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <p className="mt-1 text-xs text-slate-500">Time after which a device is flagged as 'Offline'.</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  )
}

