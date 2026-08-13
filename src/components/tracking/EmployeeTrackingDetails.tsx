'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { CalendarDays, Clock, Map, MapPin, UserRound } from 'lucide-react'

const DailyRouteMapModal = dynamic(() => import('@/components/ui/DailyRouteMapModal'), { ssr: false })

type Branch = { id: string; name: string }
type Employee = { id: string; full_name: string; designation: string | null; branch?: { name: string | null } | null }
type LocationSample = {
  id: string
  recorded_at: string
  lat: number
  lng: number
  address: string | null
  accuracy_meters: number | null
  mocked: boolean | null
  source: string
}
type Visit = { id: string; purpose: string; place_name: string | null; address: string | null; visited_at: string }
type Attendance = { clock_in_at: string; clock_out_at: string | null; clock_in_address: string | null; clock_out_address: string | null } | null
type Place = { address: string; first_seen_at: string; source: string }
type DetailResponse = {
  employee: Employee
  day: {
    attendance: Attendance
    visits: Visit[]
    samples: LocationSample[]
    places: Place[]
    summary: { sample_count: number; addressed_sample_count: number; visit_count: number; place_count: number }
  }
  month: {
    summary: { attendance_days: number; completed_attendance_days: number; visit_count: number; location_sample_count: number; addressed_location_count: number; place_count: number }
  }
}

function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

export default function EmployeeTrackingDetails() {
  const initialDate = today()
  const [branches, setBranches] = useState<Branch[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [branchId, setBranchId] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [date, setDate] = useState(initialDate)
  const [month, setMonth] = useState(initialDate.slice(0, 7))
  const [details, setDetails] = useState<DetailResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [routeOpen, setRouteOpen] = useState(false)

  useEffect(() => {
    fetch('/api/branches').then((response) => response.json()).then((data) => setBranches(Array.isArray(data) ? data : []))
  }, [])

  useEffect(() => {
    const params = new URLSearchParams()
    if (branchId) params.set('branch_id', branchId)
    fetch(`/api/employees?${params}`).then((response) => response.json()).then((data) => {
      const nextEmployees = Array.isArray(data) ? data.filter((employee: Employee & { is_active?: boolean }) => employee.is_active !== false) : []
      setEmployees(nextEmployees)
      setEmployeeId((current) => nextEmployees.some((employee) => employee.id === current) ? current : nextEmployees[0]?.id ?? '')
    })
  }, [branchId])

  useEffect(() => {
    if (!employeeId) {
      setDetails(null)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    const params = new URLSearchParams({ employee_id: employeeId, date, month })
    fetch(`/api/tracking/details?${params}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((data) => {
        if (!controller.signal.aborted) setDetails(data.error ? null : data)
      })
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [employeeId, date, month])

  const selectedEmployee = useMemo(() => employees.find((employee) => employee.id === employeeId) ?? null, [employeeId, employees])

  return (
    <section className="border-t border-zinc-200 pt-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Employee activity details</h2>
          <p className="mt-0.5 text-sm text-zinc-500">Attendance, visits, saved places, and location trail for a selected employee.</p>
        </div>
        {selectedEmployee && <div className="text-sm font-medium text-zinc-600">{selectedEmployee.full_name}{selectedEmployee.branch?.name ? ` ? ${selectedEmployee.branch.name}` : ''}</div>}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-1">
          <span className="text-xs font-medium text-zinc-500">Branch</span>
          <select value={branchId} onChange={(event) => setBranchId(event.target.value)} className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All branches</option>
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-zinc-500">Employee</span>
          <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
            {employees.length === 0 && <option value="">No active employees</option>}
            {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-zinc-500">Month summary</span>
          <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-zinc-500">Daily activity</span>
          <input type="date" value={date} onChange={(event) => { setDate(event.target.value); setMonth(event.target.value.slice(0, 7)) }} className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </label>
      </div>

      {!employeeId && <div className="mt-4 py-10 text-center text-sm text-zinc-400">Choose an employee to view their activity.</div>}
      {employeeId && loading && !details && <div className="mt-4 py-10 text-center text-sm text-zinc-400">Loading employee activity?</div>}

      {details && (
        <div className="mt-5 space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
            <Metric icon={CalendarDays} label="Present days" value={details.month.summary.attendance_days} />
            <Metric icon={Clock} label="Completed days" value={details.month.summary.completed_attendance_days} />
            <Metric icon={MapPin} label="Monthly visits" value={details.month.summary.visit_count} />
            <Metric icon={MapPin} label="Saved places" value={details.month.summary.place_count} />
            <Metric icon={Map} label="Location samples" value={details.month.summary.location_sample_count} />
            <Metric icon={UserRound} label="Named samples" value={details.month.summary.addressed_location_count} />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
            <div className="border border-zinc-200 bg-white">
              <div className="flex flex-col gap-3 border-b border-zinc-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold text-zinc-900">Daily location trail</h3>
                  <p className="mt-0.5 text-xs text-zinc-500">{format(new Date(`${date}T00:00:00`), 'EEEE, MMMM d, yyyy')} ? {details.day.summary.sample_count} samples</p>
                </div>
                <button disabled={details.day.samples.length === 0} onClick={() => setRouteOpen(true)} className="inline-flex items-center justify-center gap-1.5 border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"><Map size={14} />View day map</button>
              </div>
              <div className="divide-y divide-zinc-100">
                {details.day.samples.length === 0 && <div className="px-4 py-10 text-center text-sm text-zinc-400">No locations were received for this date.</div>}
                {details.day.samples.map((sample) => (
                  <div key={sample.id} className="flex gap-3 px-4 py-3">
                    <div className="w-16 shrink-0 pt-0.5 text-xs font-medium text-zinc-500">{format(new Date(sample.recorded_at), 'hh:mm a')}</div>
                    <MapPin size={15} className="mt-0.5 shrink-0 text-blue-600" />
                    <div className="min-w-0">
                      <div className="text-sm text-zinc-800">{sample.address || `${sample.lat.toFixed(5)}, ${sample.lng.toFixed(5)}`}</div>
                      <div className="mt-0.5 text-xs text-zinc-400">{sample.source.replaceAll('_', ' ')} ? accuracy {sample.accuracy_meters ? `${Math.round(sample.accuracy_meters)} m` : 'unknown'}{sample.mocked ? ' ? mocked' : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              <div className="border border-zinc-200 bg-white">
                <div className="border-b border-zinc-100 px-4 py-4"><h3 className="font-semibold text-zinc-900">Attendance</h3></div>
                {details.day.attendance ? (
                  <div className="space-y-3 px-4 py-4 text-sm">
                    <DetailRow label="Check-in" value={`${format(new Date(details.day.attendance.clock_in_at), 'hh:mm a')} ? ${details.day.attendance.clock_in_address || 'Location name unavailable'}`} />
                    <DetailRow label="Check-out" value={details.day.attendance.clock_out_at ? `${format(new Date(details.day.attendance.clock_out_at), 'hh:mm a')} ? ${details.day.attendance.clock_out_address || 'Location name unavailable'}` : 'Pending'} />
                  </div>
                ) : <div className="px-4 py-8 text-sm text-zinc-400">No attendance record for this day.</div>}
              </div>

              <div className="border border-zinc-200 bg-white">
                <div className="border-b border-zinc-100 px-4 py-4"><h3 className="font-semibold text-zinc-900">Logged visits</h3></div>
                {details.day.visits.length === 0 ? <div className="px-4 py-8 text-sm text-zinc-400">No visits logged for this day.</div> : (
                  <div className="divide-y divide-zinc-100">
                    {details.day.visits.map((visit) => <div key={visit.id} className="px-4 py-3"><div className="text-sm font-medium text-zinc-800">{visit.purpose}</div><div className="mt-0.5 text-xs text-zinc-500">{format(new Date(visit.visited_at), 'hh:mm a')} ? {visit.place_name || visit.address || 'Location name unavailable'}</div></div>)}
                  </div>
                )}
              </div>

              <div className="border border-zinc-200 bg-white">
                <div className="border-b border-zinc-100 px-4 py-4"><h3 className="font-semibold text-zinc-900">Places reached</h3></div>
                {details.day.places.length === 0 ? <div className="px-4 py-8 text-sm text-zinc-400">Address names appear every 30 minutes after the next APK update.</div> : (
                  <div className="divide-y divide-zinc-100">
                    {details.day.places.map((place) => <div key={place.address} className="px-4 py-3"><div className="text-sm text-zinc-800">{place.address}</div><div className="mt-0.5 text-xs text-zinc-400">{place.first_seen_at ? `First seen ${format(new Date(place.first_seen_at), 'hh:mm a')}` : 'Recorded this month'} ? {place.source.replaceAll('_', ' ')}</div></div>)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <DailyRouteMapModal isOpen={routeOpen} onClose={() => setRouteOpen(false)} employeeName={details?.employee.full_name ?? 'Employee'} date={date} points={details?.day.samples ?? []} />
    </section>
  )
}

function Metric({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: number }) {
  return <div className="border border-zinc-200 bg-white p-3"><Icon size={15} className="mb-2 text-blue-600" /><div className="text-lg font-semibold text-zinc-900">{value}</div><div className="text-xs text-zinc-500">{label}</div></div>
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <div><div className="text-xs font-medium text-zinc-400">{label}</div><div className="mt-0.5 text-sm leading-relaxed text-zinc-700">{value}</div></div>
}
