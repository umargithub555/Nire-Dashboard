'use client'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { MapPin, Clock, Calendar, LogOut } from 'lucide-react'
import { Attendance } from '@/types'

const MapModal = dynamic(() => import('@/components/ui/MapModal'), {
  ssr: false,
})

type PortalAttendanceRecord = Attendance

type SelectedLocation = {
  lat: number
  lng: number
  address: string
  employeeName: string
  branchName: string
}

export default function PortalAttendancePage() {
  const [attendance, setAttendance] = useState<PortalAttendanceRecord[]>([])
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null)

  useEffect(() => {
    fetch('/api/portal/attendance')
      .then(r => r.json())
      .then(d => setAttendance(Array.isArray(d) ? d : []))
  }, [])

  function openMap(record: PortalAttendanceRecord, type: 'checkin' | 'checkout') {
    const isCheckIn = type === 'checkin'
    const lat = isCheckIn ? record.clock_in_lat : record.clock_out_lat
    const lng = isCheckIn ? record.clock_in_lng : record.clock_out_lng
    const address = isCheckIn ? record.clock_in_address : record.clock_out_address

    if (lat === null || lng === null || !address) return

    setSelectedLocation({
      lat,
      lng,
      address,
      employeeName: `Your ${isCheckIn ? 'check-in' : 'check-out'} location`,
      branchName: format(new Date(record.date + 'T00:00:00'), 'EEE, MMM d, yyyy'),
    })
  }

  return (
    <div className="space-y-5 lg:space-y-6">
      <div>
        <h1 className="text-xl lg:text-2xl font-semibold text-zinc-900">Attendance history</h1>
        <p className="text-sm text-zinc-500 mt-0.5">{attendance.length} days recorded</p>
      </div>

      <div className="hidden lg:block bg-white border border-zinc-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/50">
              <th className="text-left px-6 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-wide">Date</th>
              <th className="text-left px-6 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-wide">Check-in</th>
              <th className="text-left px-6 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-wide">Check-out</th>
              <th className="text-left px-6 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-wide">Locations</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {attendance.length === 0 && (
              <tr><td colSpan={4} className="px-6 py-10 text-center text-zinc-400">No records yet</td></tr>
            )}
            {attendance.map((record) => (
              <tr key={record.id} className="hover:bg-zinc-50 transition-colors">
                <td className="px-6 py-4 font-medium text-zinc-800">
                  {format(new Date(record.date + 'T00:00:00'), 'EEE, MMM d, yyyy')}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 text-zinc-600">
                    <Clock size={13} className="text-zinc-400" />
                    {format(new Date(record.clock_in_at), 'hh:mm a')}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {record.clock_out_at ? (
                    <div className="flex items-center gap-1.5 text-zinc-600">
                      <LogOut size={13} className="text-zinc-400" />
                      {format(new Date(record.clock_out_at), 'hh:mm a')}
                    </div>
                  ) : (
                    <span className="text-zinc-400 text-xs">Not checked out</span>
                  )}
                </td>
                <td className="px-6 py-4 space-y-3">
                  {record.clock_in_address ? (
                    <div className="flex items-start gap-1.5">
                      <MapPin size={13} className="text-zinc-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Check-in</div>
                        <div className="text-xs text-zinc-600 max-w-[300px]">
                          {record.clock_in_address.split(',').slice(0, 3).join(',')}
                        </div>
                        {record.clock_in_lat !== null && record.clock_in_lng !== null && (
                          <button onClick={() => openMap(record, 'checkin')}
                            className="text-blue-600 text-[11px] font-semibold hover:underline mt-1 inline-flex items-center gap-1">
                            View on map
                            <MapPin size={10} />
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="text-zinc-400 text-xs">No location</span>
                  )}
                  {record.clock_out_address && (
                    <div className="flex items-start gap-1.5">
                      <MapPin size={13} className="text-zinc-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Check-out</div>
                        <div className="text-xs text-zinc-600 max-w-[300px]">
                          {record.clock_out_address.split(',').slice(0, 3).join(',')}
                        </div>
                        {record.clock_out_lat !== null && record.clock_out_lng !== null && (
                          <button onClick={() => openMap(record, 'checkout')}
                            className="text-blue-600 text-[11px] font-semibold hover:underline mt-1 inline-flex items-center gap-1">
                            View on map
                            <MapPin size={10} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="lg:hidden space-y-3">
        {attendance.length === 0 && (
          <div className="bg-white border border-zinc-200 rounded-xl py-10 text-center text-sm text-zinc-400">
            No records yet
          </div>
        )}
        {attendance.map((record) => (
          <div key={record.id} className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-800">
                <Calendar size={14} className="text-zinc-400" />
                {format(new Date(record.date + 'T00:00:00'), 'EEE, MMM d, yyyy')}
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1.5 text-sm text-zinc-600 justify-end">
                  <Clock size={13} className="text-zinc-400" />
                  {format(new Date(record.clock_in_at), 'hh:mm a')}
                </div>
                <div className="text-[11px] text-zinc-400 mt-1">
                  {record.clock_out_at ? `Out ${format(new Date(record.clock_out_at), 'hh:mm a')}` : 'Checkout pending'}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {record.clock_in_address && (
                <div className="flex items-start gap-1.5 mt-1">
                  <MapPin size={12} className="text-zinc-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 block">Check-in</span>
                    <span className="text-xs text-zinc-500">
                      {record.clock_in_address.split(',').slice(0, 2).join(',')}
                    </span>
                    {record.clock_in_lat !== null && record.clock_in_lng !== null && (
                      <button onClick={() => openMap(record, 'checkin')}
                        className="text-blue-600 text-[11px] font-semibold hover:underline mt-1 inline-flex items-center gap-1 ml-2">
                        Map
                        <MapPin size={10} />
                      </button>
                    )}
                  </div>
                </div>
              )}
              {record.clock_out_at && (
                <div className="flex items-start gap-1.5">
                  <LogOut size={12} className="text-zinc-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 block">Check-out</span>
                    <span className="text-xs text-zinc-500">
                      {format(new Date(record.clock_out_at), 'hh:mm a')}
                      {record.clock_out_address ? ` at ${record.clock_out_address.split(',').slice(0, 2).join(',')}` : ''}
                    </span>
                    {record.clock_out_lat !== null && record.clock_out_lng !== null && (
                      <button onClick={() => openMap(record, 'checkout')}
                        className="text-blue-600 text-[11px] font-semibold hover:underline mt-1 inline-flex items-center gap-1 ml-2">
                        Map
                        <MapPin size={10} />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <MapModal
        isOpen={!!selectedLocation}
        onClose={() => setSelectedLocation(null)}
        lat={selectedLocation?.lat ?? 0}
        lng={selectedLocation?.lng ?? 0}
        address={selectedLocation?.address ?? ''}
        employeeName={selectedLocation?.employeeName ?? 'Your attendance location'}
        branchName={selectedLocation?.branchName ?? ''}
      />
    </div>
  )
}
