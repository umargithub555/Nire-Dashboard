'use client'
import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { MapPin } from 'lucide-react'
import MapModal from '@/components/ui/MapModal'

export default function VisitsPage() {
  const [visits, setVisits] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [branchFilter, setBranchFilter] = useState('')
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null)

  useEffect(() => {
    fetch('/api/branches').then(r => r.json()).then(setBranches)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams()
    if (branchFilter) params.set('branch_id', branchFilter)
    fetch(`/api/visits?${params}`).then(r => r.json()).then(setVisits)
  }, [branchFilter])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Visit log</h1>
        <p className="text-sm text-zinc-500 mt-1">External visits and training check-ins</p>
      </div>

      <div className="flex gap-3">
        <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)}
          className="px-3 py-2 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All branches</option>
          {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      <div className="space-y-3">
        {visits.length === 0 && (
          <div className="bg-white border border-zinc-200 rounded-xl px-6 py-10 text-center text-zinc-400 text-sm">
            No visits recorded yet
          </div>
        )}
        {visits.map((v: any) => (
          <div key={v.id} className="bg-white border border-zinc-200 rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium text-zinc-900">{v.employee?.full_name}</div>
                <div className="text-sm text-zinc-500 mt-0.5">{v.employee?.designation}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-zinc-700">{format(new Date(v.visited_at), 'MMM d, yyyy')}</div>
                <div className="text-xs text-zinc-400">{format(new Date(v.visited_at), 'hh:mm a')}</div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-zinc-50 space-y-1.5">
              <div className="text-sm font-medium text-zinc-800">{v.purpose}</div>
              {v.place_name && <div className="text-sm text-zinc-500">{v.place_name}</div>}
              {v.address && (
                <div className="flex items-start gap-1.5">
                  <MapPin size={13} className="text-zinc-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-xs text-zinc-500">{v.address}</span>
                    {v.lat && (
                      <button onClick={() => setSelectedRecord(v)}
                        className="text-blue-600 text-[11px] font-semibold hover:underline mt-1 inline-flex items-center gap-1 ml-2">
                        View on map
                        <MapPin size={10} />
                      </button>
                    )}
                  </div>
                </div>
              )}
              {v.notes && <div className="text-xs text-zinc-400 italic">Note: {v.notes}</div>}
            </div>
          </div>
        ))}
      </div>

      <MapModal
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        lat={selectedRecord?.lat}
        lng={selectedRecord?.lng}
        address={selectedRecord?.address}
        employeeName={selectedRecord?.employee?.full_name || 'Employee Visit'}
        branchName={selectedRecord?.employee?.branch?.name || ''}
      />
    </div>
  )
}