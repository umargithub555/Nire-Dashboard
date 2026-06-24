'use client'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ClipboardCheck, MapPin, Receipt, Clock } from 'lucide-react'

export default function PortalOverviewPage() {
  const [profile, setProfile] = useState<any>(null)
  const [attendance, setAttendance] = useState<any[]>([])
  const [visits, setVisits] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [checkedInToday, setCheckedInToday] = useState(false)
  const [checkingIn, setCheckingIn] = useState(false)
  const [locationStatus, setLocationStatus] = useState('')
  const [profileError, setProfileError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/portal/me').then(r => r.json()),
      fetch('/api/portal/attendance').then(r => r.json()),
      fetch('/api/portal/visits').then(r => r.json()),
      fetch('/api/portal/expenses').then(r => r.json()),
    ]).then(([prof, att, vis, exp]) => {
      if (prof.error) { setProfileError(prof.error); return }
      setProfile(prof)
      const validAtt = Array.isArray(att) ? att : []
      const validVis = Array.isArray(vis) ? vis : []
      const validExp = exp && Array.isArray(exp.expenses) ? exp.expenses : []
      setAttendance(validAtt)
      setVisits(validVis)
      setExpenses(validExp)
      const today = format(new Date(), 'yyyy-MM-dd')
      setCheckedInToday(validAtt.some((a: any) => a.date === today))
    }).catch(err => {
      setProfileError('Failed to load portal data')
      console.error(err)
    })
  }, [])

  async function handleCheckIn() {
    setCheckingIn(true)
    setLocationStatus('Getting your location…')
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation not supported by your browser')
      setCheckingIn(false)
      return
    }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords
      setLocationStatus('Got location, checking in…')
      let address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`
      try {
        const geo = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
        ).then(r => r.json())
        if (geo.display_name) address = geo.display_name
      } catch {}
      const res = await fetch('/api/portal/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng, address }),
      })
      if (res.ok) {
        setCheckedInToday(true)
        setLocationStatus('')
        const att = await fetch('/api/portal/attendance').then(r => r.json())
        setAttendance(Array.isArray(att) ? att : [])
      } else {
        const err = await res.json()
        setLocationStatus(err.error ?? 'Check-in failed')
      }
      setCheckingIn(false)
    }, () => {
      setLocationStatus('Location access denied. Please allow location in browser.')
      setCheckingIn(false)
    }, { enableHighAccuracy: true, timeout: 10000 })
  }

  if (profileError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center bg-white border border-zinc-200 rounded-2xl shadow-sm">
        <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500 mb-5 animate-pulse">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <h2 className="text-xl font-bold text-zinc-900 mb-2">Access Restricted</h2>
        <p className="text-sm text-zinc-500 max-w-sm mb-6 leading-relaxed">
          {profileError === 'Employee profile not found'
            ? 'No employee profile found for your account. If you are an administrator, use the Admin Dashboard.'
            : profileError}
        </p>
        {profileError === 'Employee profile not found' && (
          <a href="/" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all hover:scale-[1.02] active:scale-95">
            Go to Admin Dashboard
          </a>
        )}
      </div>
    )
  }

  const today = format(new Date(), 'yyyy-MM-dd')
  const todayRecord = attendance.find((a: any) => a.date === today)
  const myExpenses = expenses.filter((e: any) => e.is_own)
  const totalSpent = myExpenses.reduce((s: number, e: any) => s + Number(e.amount), 0)

  return (
    <div className="space-y-5 lg:space-y-8">
      <div>
        <h1 className="text-xl lg:text-2xl font-semibold text-zinc-900">
          {profile ? `Good ${getGreeting()}, ${profile.full_name.split(' ')[0]}` : 'Overview'}
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      {/* Check-in card */}
      <div className={`rounded-xl border p-4 lg:p-5 flex items-center justify-between gap-4 ${
        checkedInToday ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-zinc-200'
      }`}>
        <div className="min-w-0">
          <div className="font-medium text-zinc-900 text-sm lg:text-base">
            {checkedInToday ? 'Checked in today ✓' : 'Not checked in yet'}
          </div>
          {todayRecord ? (
            <div className="text-xs lg:text-sm text-zinc-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
              <Clock size={12} />
              {format(new Date(todayRecord.clock_in_at), 'hh:mm a')}
              {todayRecord.clock_in_address && (
                <span className="truncate max-w-[200px] lg:max-w-[260px]">
                  · {todayRecord.clock_in_address.split(',').slice(0, 2).join(',')}
                </span>
              )}
            </div>
          ) : (
            <div className="text-xs lg:text-sm text-zinc-400 mt-0.5">
              {locationStatus || 'Tap to mark attendance with your location'}
            </div>
          )}
          {locationStatus && !checkedInToday && (
            <div className="text-xs text-zinc-500 mt-1">{locationStatus}</div>
          )}
        </div>
        {!checkedInToday && (
          <button onClick={handleCheckIn} disabled={checkingIn}
            className="px-3 lg:px-4 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors shrink-0 active:scale-95">
            {checkingIn ? 'Checking…' : 'Check in'}
          </button>
        )}
        {checkedInToday && (
          <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
        )}
      </div>

      {/* Stat cards — 1 col on mobile, 3 on desktop */}
      <div className="grid grid-cols-3 gap-3 lg:gap-4">
        {[
          { label: 'Days present', value: attendance.length, icon: ClipboardCheck, color: 'bg-blue-50 text-blue-600' },
          { label: 'Total visits', value: visits.length, icon: MapPin, color: 'bg-violet-50 text-violet-600' },
          { label: 'Expenses', value: `PKR ${totalSpent.toLocaleString()}`, icon: Receipt, color: 'bg-amber-50 text-amber-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-zinc-200 rounded-xl p-3 lg:p-5">
            <div className={`inline-flex p-1.5 lg:p-2 rounded-lg ${color} mb-2 lg:mb-3`}>
              <Icon size={15} className="lg:hidden" />
              <Icon size={18} className="hidden lg:block" />
            </div>
            <div className="text-base lg:text-2xl font-semibold text-zinc-900 truncate">{value}</div>
            <div className="text-[10px] lg:text-sm text-zinc-500 mt-0.5 leading-snug">{label}</div>
          </div>
        ))}
      </div>

      {/* Recent attendance */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
        <div className="px-4 lg:px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="font-medium text-zinc-900 text-sm lg:text-base">Recent attendance</h2>
          <a href="/portal/attendance" className="text-xs text-blue-600 hover:underline">View all</a>
        </div>
        <div className="divide-y divide-zinc-50">
          {attendance.slice(0, 7).map((a: any) => (
            <div key={a.id} className="px-4 lg:px-6 py-3 flex items-center justify-between">
              <div className="text-sm text-zinc-700">{format(new Date(a.date + 'T00:00:00'), 'EEE, MMM d')}</div>
              <div className="text-sm text-zinc-500">{format(new Date(a.clock_in_at), 'hh:mm a')}</div>
            </div>
          ))}
          {attendance.length === 0 && (
            <div className="px-4 lg:px-6 py-8 text-center text-sm text-zinc-400">No attendance records yet</div>
          )}
        </div>
      </div>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}