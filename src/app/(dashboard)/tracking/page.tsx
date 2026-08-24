'use client'
import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Clock, MapPin, RefreshCw, Settings, ShieldCheck, WifiOff } from 'lucide-react'
import toast from 'react-hot-toast'

const MapModal = dynamic(() => import('@/components/ui/MapModal'), { ssr: false })

type TrackingPolicy = {
  id: string
  name: string
  office_start_time: string
  office_end_time: string
  timezone: string
  sample_interval_minutes: number
  grace_period_minutes: number
}

type LiveEmployee = {
  employee: {
    id: string
    full_name: string
    designation: string | null
    branch?: { name: string | null } | null
  }
  attendance: {
    clock_in_at: string
    clock_out_at: string | null
  } | null
  latest_sample: {
    lat: number
    lng: number
    address: string | null
    accuracy_meters: number | null
    recorded_at: string
    mocked: boolean | null
    source: string
  } | null
  device: {
    permission_foreground: boolean
    permission_background: boolean
    location_services_enabled: boolean
    last_error: string | null
  } | null
  status: 'active' | 'stale' | 'offline' | 'never'
  last_seen_at: string | null
}

type SelectedLocation = {
  lat: number
  lng: number
  address: string
  employeeName: string
  branchName: string
}

const defaultPolicy = {
  name: 'Default policy',
  office_start_time: '09:00',
  office_end_time: '17:00',
  timezone: 'Asia/Karachi',
  sample_interval_minutes: 30,
  grace_period_minutes: 10,
}

export default function TrackingPage() {
  const [policy, setPolicy] = useState<TrackingPolicy | null>(null)
  const [form, setForm] = useState(defaultPolicy)
  const [employees, setEmployees] = useState<LiveEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null)

  async function load() {
    setLoading(true)
    try {
      const [policyRes, liveRes] = await Promise.all([
        fetch('/api/tracking/policy', { cache: 'no-store' }).then((r) => r.json()),
        fetch('/api/tracking/live', { cache: 'no-store' }).then((r) => r.json()),
      ])

      if (policyRes && !policyRes.error) {
        setPolicy(policyRes)
        setForm({
          name: policyRes.name,
          office_start_time: policyRes.office_start_time.slice(0, 5),
          office_end_time: policyRes.office_end_time.slice(0, 5),
          timezone: policyRes.timezone,
          sample_interval_minutes: policyRes.sample_interval_minutes,
          grace_period_minutes: policyRes.grace_period_minutes,
        })
      }

      setEmployees(Array.isArray(liveRes.employees) ? liveRes.employees : [])
    } catch {
      toast.error('Could not load tracking data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(load, 0)
    const id = window.setInterval(load, 60000)
    return () => {
      window.clearTimeout(timeoutId)
      window.clearInterval(id)
    }
  }, [])

  async function savePolicy(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/tracking/policy', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const payload = await res.json()
    if (res.ok) {
      setPolicy(payload)
      toast.success('Tracking settings saved')
      await load()
    } else {
      toast.error(payload.error ?? 'Could not save tracking settings')
    }
    setSaving(false)
  }

  const counts = useMemo(() => {
    return employees.reduce(
      (acc, item) => {
        acc[item.status] += 1
        if (item.attendance?.clock_in_at && !item.attendance.clock_out_at) acc.checkedIn += 1
        return acc
      },
      { active: 0, stale: 0, offline: 0, never: 0, checkedIn: 0 }
    )
  }, [employees])

  return (
    <>
      <div className="space-y-5 lg:space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl lg:text-2xl font-semibold text-zinc-900">Tracking</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              {policy ? `Every ${policy.sample_interval_minutes} min updates (hours managed per branch)` : 'Loading policy'}
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 border border-zinc-200 rounded-lg text-sm font-medium text-zinc-600 bg-white hover:bg-zinc-50 disabled:opacity-60"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
          {[
            { label: 'Active now', value: counts.active, icon: ShieldCheck, tone: 'bg-emerald-50 text-emerald-700' },
            { label: 'Stale', value: counts.stale, icon: Clock, tone: 'bg-amber-50 text-amber-700' },
            { label: 'Offline', value: counts.offline + counts.never, icon: WifiOff, tone: 'bg-red-50 text-red-700' },
            { label: 'Checked in', value: counts.checkedIn, icon: Clock, tone: 'bg-blue-50 text-blue-700' },
            { label: 'Employees', value: employees.length, icon: MapPin, tone: 'bg-zinc-100 text-zinc-700' },
          ].map(({ label, value, icon: Icon, tone }) => (
            <div key={label} className="bg-white border border-zinc-200 rounded-xl p-4">
              <div className={`inline-flex p-2 rounded-lg ${tone} mb-3`}>
                <Icon size={16} />
              </div>
              <div className="text-xl font-semibold text-zinc-900">{value}</div>
              <div className="text-xs text-zinc-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-5">
          <form onSubmit={savePolicy} className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4 h-fit">
            <div className="flex items-center gap-2">
              <Settings size={17} className="text-zinc-500" />
              <h2 className="font-semibold text-zinc-900">Global Settings</h2>
            </div>

            <div className="rounded-lg bg-blue-50/70 border border-blue-100 p-3 text-xs text-blue-800">
              ⏰ <strong>Shift Hours:</strong> Managed per branch under <a href="/branches" className="underline font-semibold text-blue-900">Branches</a> tab.
            </div>

            <label className="space-y-1.5 block">
              <span className="text-xs font-medium text-zinc-500">Interval minutes</span>
              <input
                type="number"
                min={1}
                max={240}
                value={form.sample_interval_minutes}
                onChange={(e) => setForm((f) => ({ ...f, sample_interval_minutes: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <label className="space-y-1.5 block">
              <span className="text-xs font-medium text-zinc-500">Grace minutes</span>
              <input
                type="number"
                min={0}
                max={120}
                value={form.grace_period_minutes}
                onChange={(e) => setForm((f) => ({ ...f, grace_period_minutes: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg"
            >
              {saving ? 'Saving...' : 'Save settings'}
            </button>
          </form>

          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
            <div className="px-4 lg:px-5 py-4 border-b border-zinc-100">
              <h2 className="font-semibold text-zinc-900">Live Status</h2>
            </div>
            <div className="divide-y divide-zinc-50">
              {employees.length === 0 && (
                <div className="px-5 py-10 text-center text-sm text-zinc-400">
                  {loading ? 'Loading employees...' : 'No active employees found'}
                </div>
              )}
              {employees.map((item) => (
                <div key={item.employee.id} className="px-4 lg:px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-zinc-900">{item.employee.full_name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusClass(item.status)}`}>
                        {statusLabel(item.status)}
                      </span>
                      {item.latest_sample?.mocked && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-100">
                          Mocked
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5">
                      {[item.employee.designation, item.employee.branch?.name].filter(Boolean).join(' - ') || 'Employee'}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">
                      {item.last_seen_at ? `Last seen ${format(new Date(item.last_seen_at), 'hh:mm a')}` : 'No location received'}
                      {item.latest_sample?.address ? ` - ${item.latest_sample.address}` : ''}
                      {item.latest_sample ? ` - ${item.latest_sample.lat.toFixed(5)}, ${item.latest_sample.lng.toFixed(5)}` : ''}
                      {item.latest_sample?.accuracy_meters ? ` - ${Math.round(item.latest_sample.accuracy_meters)}m` : ''}
                    </div>
                    {item.device && (!item.device.permission_background || !item.device.location_services_enabled || item.device.last_error) && (
                      <div className="text-xs text-amber-700 mt-1">
                        {!item.device.permission_background ? 'Background permission missing. ' : ''}
                        {!item.device.location_services_enabled ? 'Location services off. ' : ''}
                        {item.device.last_error || ''}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-xs text-zinc-500 text-right hidden sm:block">
                      {item.attendance?.clock_in_at ? (
                        <>
                          In {format(new Date(item.attendance.clock_in_at), 'hh:mm a')}
                          {item.attendance.clock_out_at ? ` - Out ${format(new Date(item.attendance.clock_out_at), 'hh:mm a')}` : ''}
                        </>
                      ) : (
                        'Not checked in'
                      )}
                    </div>
                    <button
                      disabled={!item.latest_sample}
                      onClick={() => item.latest_sample && setSelectedLocation({
                        lat: item.latest_sample.lat,
                        lng: item.latest_sample.lng,
                        address: item.latest_sample.address || `${item.latest_sample.lat.toFixed(5)}, ${item.latest_sample.lng.toFixed(5)}`,
                        employeeName: item.employee.full_name,
                        branchName: item.employee.branch?.name || 'Latest location',
                      })}
                      className="inline-flex items-center gap-1.5 px-3 py-2 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
                    >
                      <MapPin size={14} />
                      Map
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>


      <MapModal
        isOpen={!!selectedLocation}
        onClose={() => setSelectedLocation(null)}
        lat={selectedLocation?.lat ?? 0}
        lng={selectedLocation?.lng ?? 0}
        address={selectedLocation?.address ?? ''}
        employeeName={selectedLocation?.employeeName ?? 'Employee'}
        branchName={selectedLocation?.branchName ?? 'Latest location'}
      />
    </>
  )
}

function statusLabel(status: LiveEmployee['status']) {
  if (status === 'active') return 'Active'
  if (status === 'stale') return 'Stale'
  if (status === 'offline') return 'Offline'
  return 'Never'
}

function statusClass(status: LiveEmployee['status']) {
  if (status === 'active') return 'bg-emerald-50 text-emerald-700 border border-emerald-100'
  if (status === 'stale') return 'bg-amber-50 text-amber-700 border border-amber-100'
  return 'bg-zinc-100 text-zinc-600 border border-zinc-200'
}
