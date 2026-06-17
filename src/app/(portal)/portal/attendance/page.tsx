'use client'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { MapPin, Clock, Calendar } from 'lucide-react'

export default function PortalAttendancePage() {
  const [attendance, setAttendance] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/portal/attendance')
      .then(r => r.json())
      .then(d => setAttendance(Array.isArray(d) ? d : []))
  }, [])

  return (
    <div className="space-y-5 lg:space-y-6">
      <div>
        <h1 className="text-xl lg:text-2xl font-semibold text-zinc-900">Attendance history</h1>
        <p className="text-sm text-zinc-500 mt-0.5">{attendance.length} days recorded</p>
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block bg-white border border-zinc-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/50">
              <th className="text-left px-6 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-wide">Date</th>
              <th className="text-left px-6 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-wide">Check-in time</th>
              <th className="text-left px-6 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-wide">Location</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {attendance.length === 0 && (
              <tr><td colSpan={3} className="px-6 py-10 text-center text-zinc-400">No records yet</td></tr>
            )}
            {attendance.map((a: any) => (
              <tr key={a.id} className="hover:bg-zinc-50 transition-colors">
                <td className="px-6 py-4 font-medium text-zinc-800">
                  {format(new Date(a.date + 'T00:00:00'), 'EEE, MMM d, yyyy')}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 text-zinc-600">
                    <Clock size={13} className="text-zinc-400" />
                    {format(new Date(a.clock_in_at), 'hh:mm a')}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {a.clock_in_address ? (
                    <div className="flex items-start gap-1.5">
                      <MapPin size={13} className="text-zinc-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs text-zinc-600 max-w-[300px]">
                          {a.clock_in_address.split(',').slice(0, 3).join(',')}
                        </div>
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

      {/* Mobile card list */}
      <div className="lg:hidden space-y-3">
        {attendance.length === 0 && (
          <div className="bg-white border border-zinc-200 rounded-xl py-10 text-center text-sm text-zinc-400">
            No records yet
          </div>
        )}
        {attendance.map((a: any) => (
          <div key={a.id} className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-800">
                <Calendar size={14} className="text-zinc-400" />
                {format(new Date(a.date + 'T00:00:00'), 'EEE, MMM d, yyyy')}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-zinc-600">
                <Clock size={13} className="text-zinc-400" />
                {format(new Date(a.clock_in_at), 'hh:mm a')}
              </div>
            </div>
            {a.clock_in_address && (
              <div className="flex items-start gap-1.5 mt-1">
                <MapPin size={12} className="text-zinc-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-xs text-zinc-500">
                    {a.clock_in_address.split(',').slice(0, 2).join(',')}
                  </span>
                  {a.clock_in_lat && (
                    <a href={`https://maps.google.com/?q=${a.clock_in_lat},${a.clock_in_lng}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-blue-600 text-xs hover:underline ml-2">
                      Map →
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