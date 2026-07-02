'use client'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { MapPin, Plus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import MapModal from '@/components/ui/MapModal'

export default function PortalVisitsPage() {
  const [visits, setVisits] = useState<any[]>([])
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [form, setForm] = useState({
    purpose: '', place_name: '', notes: '',
    lat: '', lng: '', address: ''
  })

  useEffect(() => {
    fetch('/api/portal/visits')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setVisits(data)
        } else {
          setVisits([])
        }
      })
      .catch(() => setVisits([]))
  }, [])

  function captureLocation() {
    setLocating(true)
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords
      let address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`
      try {
        const geo = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
        ).then(r => r.json())
        if (geo.display_name) address = geo.display_name
      } catch {}
      setForm(f => ({ ...f, lat: String(lat), lng: String(lng), address }))
      setLocating(false)
    }, () => {
      toast.error('Could not get location. Please allow location access.')
      setLocating(false)
    }, { enableHighAccuracy: true })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.lat) { toast.error('Please capture your location first'); return }
    setLoading(true)
    const res = await fetch('/api/portal/visits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      toast.success('Visit logged')
      setShowModal(false)
      setForm({ purpose: '', place_name: '', notes: '', lat: '', lng: '', address: '' })
      fetch('/api/portal/visits')
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) setVisits(data)
        })
    } else {
      const err = await res.json()
      toast.error(err.error)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-5 lg:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-semibold text-zinc-900">My visits</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{visits.length} visits logged</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium rounded-lg transition-colors active:scale-95">
          <Plus size={16} />
          <span className="hidden sm:inline">Log visit</span>
          <span className="sm:hidden">Log</span>
        </button>
      </div>

      <div className="space-y-3">
        {visits.length === 0 && (
          <div className="bg-white border border-zinc-200 rounded-xl px-6 py-10 text-center text-zinc-400 text-sm">
            No visits logged yet
          </div>
        )}
        {visits.map((v: any) => (
          <div key={v.id} className="bg-white border border-zinc-200 rounded-xl p-4 lg:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="font-medium text-zinc-900 text-sm lg:text-base">{v.purpose}</div>
              <div className="text-xs text-zinc-400 shrink-0">{format(new Date(v.visited_at), 'MMM d · hh:mm a')}</div>
            </div>
            {v.place_name && <div className="text-sm text-zinc-500 mt-1">{v.place_name}</div>}
            {v.address && (
              <div className="flex items-start gap-1.5 mt-2">
                <MapPin size={13} className="text-zinc-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-xs text-zinc-500">{v.address.split(',').slice(0, 3).join(',')}</span>
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
            {v.notes && <div className="text-xs text-zinc-400 mt-2 italic">{v.notes}</div>}
          </div>
        ))}
      </div>

      {/* Modal — bottom sheet on mobile */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 sm:p-6 max-h-[92vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-zinc-900">Log a visit</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-700">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Purpose of visit</label>
                <input value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900"
                  placeholder="e.g. Teacher training at school" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Place name</label>
                <input value={form.place_name} onChange={e => setForm(f => ({ ...f, place_name: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900"
                  placeholder="e.g. Beaconhouse School F-8" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
                  rows={2} placeholder="Optional notes…" />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Current location</label>
                {form.address ? (
                  <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <MapPin size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                    <div className="text-xs text-emerald-700 flex-1">{form.address.split(',').slice(0, 3).join(',')}</div>
                    <button type="button" onClick={() => setForm(f => ({ ...f, lat: '', lng: '', address: '' }))}
                      className="text-emerald-500 hover:text-emerald-700">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={captureLocation} disabled={locating}
                    className="w-full py-2.5 border border-dashed border-zinc-300 rounded-lg text-sm text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 transition-colors flex items-center justify-center gap-2">
                    <MapPin size={15} />
                    {locating ? 'Getting location…' : 'Capture current location'}
                  </button>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-zinc-200 rounded-lg text-sm font-medium hover:bg-zinc-50">
                  Cancel
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-60 text-white text-sm font-medium rounded-lg">
                  {loading ? 'Logging…' : 'Log visit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <MapModal
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        lat={selectedRecord?.lat}
        lng={selectedRecord?.lng}
        address={selectedRecord?.address}
        employeeName={selectedRecord?.purpose || 'Visit Location'}
        branchName={selectedRecord?.place_name || ''}
      />
    </div>
  )
}