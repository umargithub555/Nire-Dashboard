'use client'
import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { MapPin, Clock } from 'lucide-react'

export default function AttendancePage() {
  const [attendance, setAttendance] = useState<any[]>([])
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [branchFilter, setBranchFilter] = useState('')
  const [branches, setBranches] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/branches').then(r => r.json()).then(setBranches)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams({ date })
    if (branchFilter) params.set('branch_id', branchFilter)
    fetch(`/api/attendance?${params}`).then(r => r.json()).then(setAttendance)
  }, [date, branchFilter])

  return (
    <div className="space-y-5 lg:space-y-6">
      <div>
        <h1 className="text-xl lg:text-2xl font-semibold text-zinc-900">Attendance</h1>
        <p className="text-sm text-zinc-500 mt-0.5">{attendance.length} check-ins on {format(new Date(date + 'T00:00:00'), 'MMMM d, yyyy')}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
        <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="">All branches</option>
          {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {/* Desktop table view */}
      <div className="hidden lg:block bg-white border border-zinc-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/50">
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Employee</th>
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Branch</th>
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Check-in time</th>
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Location</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {attendance.length === 0 && (
              <tr><td colSpan={4} className="px-6 py-10 text-center text-zinc-400 text-sm">No attendance records found</td></tr>
            )}
            {attendance.map((a: any) => (
              <tr key={a.id} className="hover:bg-zinc-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-semibold text-zinc-800 leading-tight">{a.employee?.full_name}</div>
                  <div className="text-zinc-400 text-xs mt-0.5">{a.employee?.designation}</div>
                </td>
                <td className="px-6 py-4 text-zinc-600 font-medium">{a.employee?.branch?.name}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 text-zinc-700">
                    <Clock size={13} className="text-zinc-400" />
                    {format(new Date(a.clock_in_at), 'hh:mm a')}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {a.clock_in_address ? (
                    <div className="flex items-start gap-1.5">
                      <MapPin size={13} className="text-zinc-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-zinc-600 text-xs max-w-[240px] leading-relaxed">{a.clock_in_address}</div>
                        {a.clock_in_lat && (
                          <a href={`https://maps.google.com/?q=${a.clock_in_lat},${a.clock_in_lng}`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-blue-600 text-xs hover:underline mt-0.5 inline-block">
                            View on map →
                          </a>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="text-zinc-400 text-xs">No location</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list view */}
      <div className="lg:hidden space-y-3">
        {attendance.length === 0 && (
          <div className="bg-white border border-zinc-200 rounded-xl py-10 text-center text-sm text-zinc-400">
            No attendance records found
          </div>
        )}
        {attendance.map((a: any) => (
          <div key={a.id} className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold text-zinc-800 truncate">{a.employee?.full_name}</div>
                <div className="text-xs text-zinc-400 truncate">{a.employee?.designation}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1 text-xs font-semibold text-zinc-700 justify-end">
                  <Clock size={12} className="text-zinc-400" />
                  {format(new Date(a.clock_in_at), 'hh:mm a')}
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">{a.employee?.branch?.name}</div>
              </div>
            </div>
            {a.clock_in_address && (
              <div className="flex items-start gap-1.5 pt-2.5 border-t border-zinc-100">
                <MapPin size={13} className="text-zinc-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">{a.clock_in_address}</div>
                  {a.clock_in_lat && (
                    <a href={`https://maps.google.com/?q=${a.clock_in_lat},${a.clock_in_lng}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-blue-600 text-[11px] font-semibold hover:underline mt-1 inline-block">
                      View on map →
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}