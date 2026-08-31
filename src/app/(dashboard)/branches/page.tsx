'use client'
import { useState, useEffect } from 'react'
import { Plus, Building2, Pencil, Trash2, Clock, MapPin } from 'lucide-react'
import { Branch } from '@/types'
import { parseCoordinatesString } from '@/lib/geo'
import toast from 'react-hot-toast'

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editBranch, setEditBranch] = useState<Branch | null>(null)
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null)
  const [form, setForm] = useState({
    name: '',
    address: '',
    office_start_time: '09:00',
    office_end_time: '17:00',
    grace_period_minutes: 20,
    coordsInput: '',
    radius_meters: 100,
  })
  const [loading, setLoading] = useState(false)

  async function load() {
    const res = await fetch('/api/branches')
    setBranches(await res.json())
  }

  useEffect(() => { load() }, [])

  function handleOpenEdit(branch: Branch) {
    setEditBranch(branch)
    let existingCoords = ''
    if (branch.latitude !== null && branch.latitude !== undefined && branch.longitude !== null && branch.longitude !== undefined) {
      existingCoords = `${branch.latitude}, ${branch.longitude}`
    }

    setForm({
      name: branch.name,
      address: branch.address || '',
      office_start_time: (branch.office_start_time || '09:00').slice(0, 5),
      office_end_time: (branch.office_end_time || '17:00').slice(0, 5),
      grace_period_minutes: branch.grace_period_minutes ?? 20,
      coordsInput: existingCoords,
      radius_meters: branch.radius_meters ?? 100,
    })
    setShowModal(true)
  }

  function handleCloseModal() {
    setShowModal(false)
    setEditBranch(null)
    setForm({
      name: '',
      address: '',
      office_start_time: '09:00',
      office_end_time: '17:00',
      grace_period_minutes: 20,
      coordsInput: '',
      radius_meters: 100,
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const isEdit = !!editBranch
    const url = isEdit ? `/api/branches?id=${editBranch.id}` : '/api/branches'
    const method = isEdit ? 'PUT' : 'POST'

    const { lat, lng } = parseCoordinatesString(form.coordsInput)

    const payload = {
      name: form.name,
      address: form.address,
      office_start_time: form.office_start_time,
      office_end_time: form.office_end_time,
      grace_period_minutes: form.grace_period_minutes,
      latitude: lat,
      longitude: lng,
      radius_meters: form.radius_meters || 100,
    }

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      toast.success(isEdit ? 'Branch updated' : 'Branch created')
      handleCloseModal()
      load()
    } else {
      const err = await res.json()
      toast.error(err.error)
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    setLoading(true)
    const res = await fetch(`/api/branches?id=${id}`, {
      method: 'DELETE',
    })

    if (res.ok) {
      toast.success('Branch deleted')
      setBranchToDelete(null)
      load()
    } else {
      const err = await res.json()
      toast.error(err.error)
    }
    setLoading(false)
  }

  function formatBranchTiming(start?: string, end?: string) {
    if (!start || !end) return '09:00 AM - 05:00 PM'
    try {
      const d1 = new Date(`2000-01-01T${start.slice(0, 5)}:00`)
      const d2 = new Date(`2000-01-01T${end.slice(0, 5)}:00`)
      const sStr = d1.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      const eStr = d2.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      return `${sStr} - ${eStr}`
    } catch {
      return `${start.slice(0, 5)} - ${end.slice(0, 5)}`
    }
  }

  return (
    <div className="space-y-5 lg:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-semibold text-zinc-900">Branches</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{branches.length} branch{branches.length !== 1 ? 'es' : ''}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Add branch</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
        {branches.length === 0 && (
          <div className="col-span-full bg-white border border-zinc-200 rounded-xl py-10 text-center text-sm text-zinc-400">
            No branches found
          </div>
        )}
        {branches.map(branch => (
          <div key={branch.id} className="group relative bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl p-4 lg:p-5 hover:shadow-md transition-all duration-200 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-blue-50 group-hover:bg-blue-100 rounded-lg flex items-center justify-center transition-colors shrink-0">
                  <Building2 size={18} className="text-blue-600" />
                </div>
                {/* Actions */}
                <div className="flex gap-1.5 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={() => handleOpenEdit(branch)}
                    className="p-1.5 hover:bg-zinc-100 rounded-md text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer"
                    title="Edit Branch"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setBranchToDelete(branch)}
                    className="p-1.5 hover:bg-red-50 rounded-md text-zinc-500 hover:text-red-600 transition-colors cursor-pointer"
                    title="Delete Branch"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <div className="font-semibold text-zinc-900 text-base lg:text-lg leading-snug">{branch.name}</div>
              {branch.address && <div className="text-sm text-zinc-500 mt-1.5 line-clamp-2 leading-relaxed">{branch.address}</div>}

              <div className="mt-3.5 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs font-medium text-zinc-600">
                <div className="flex items-center gap-1.5">
                  <Clock size={13} className="text-blue-600 shrink-0" />
                  <span>{formatBranchTiming(branch.office_start_time, branch.office_end_time)}</span>
                  <span className="text-zinc-400">({branch.grace_period_minutes ?? 20}m grace)</span>
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-zinc-100/70 flex items-center justify-between text-xs text-zinc-500">
                <div className="flex items-center gap-1.5 truncate pr-2">
                  <MapPin size={13} className="text-blue-600 shrink-0" />
                  <span className="truncate font-mono text-[11px]">
                    {branch.latitude && branch.longitude
                      ? `${branch.latitude}, ${branch.longitude}`
                      : 'GPS Not Configured'}
                  </span>
                </div>
                <span className="bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-full text-[11px] shrink-0">
                  {branch.radius_meters ?? 100}m Radius
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 sm:p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="font-semibold text-zinc-900 text-lg mb-5">{editBranch ? 'Edit branch' : 'Add branch'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Branch name</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="e.g. Peshawar Main"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Address</label>
                <textarea
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none h-16"
                  placeholder="Street address"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">Office Start Time</label>
                  <input
                    type="time"
                    value={form.office_start_time}
                    onChange={e => setForm(f => ({ ...f, office_start_time: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">Office End Time</label>
                  <input
                    type="time"
                    value={form.office_end_time}
                    onChange={e => setForm(f => ({ ...f, office_end_time: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Check-in Grace Period (minutes)</label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={form.grace_period_minutes}
                  onChange={e => setForm(f => ({ ...f, grace_period_minutes: Number(e.target.value) || 0 }))}
                  className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  required
                />
              </div>

              <div className="border-t border-zinc-150 pt-3">
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Google Maps Coordinates (Lat, Lng)
                </label>
                <input
                  type="text"
                  value={form.coordsInput}
                  onChange={e => setForm(f => ({ ...f, coordsInput: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-zinc-400 font-mono text-xs"
                  placeholder="e.g. 33.6844, 73.0478"
                />
                <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                  Right-click office on Google Maps → Copy coordinates → Paste here.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Check-In Geofence Radius (Meters)
                </label>
                <input
                  type="number"
                  min="10"
                  max="5000"
                  value={form.radius_meters}
                  onChange={e => setForm(f => ({ ...f, radius_meters: Number(e.target.value) || 100 }))}
                  className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="100"
                  required
                />
                <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                  On-site staff must be within this radius (e.g. 100m) to check in.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={handleCloseModal}
                  className="flex-1 py-2.5 border border-zinc-200 rounded-lg text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer">
                  {loading ? (editBranch ? 'Saving…' : 'Creating…') : (editBranch ? 'Save changes' : 'Create branch')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {branchToDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-6 shadow-xl">
            <h3 className="font-semibold text-zinc-900 text-lg mb-2">Delete Branch</h3>
            <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
              Are you sure you want to delete <span className="font-medium text-zinc-800">"{branchToDelete.name}"</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setBranchToDelete(null)}
                className="flex-1 py-2.5 border border-zinc-200 rounded-lg text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(branchToDelete.id)}
                disabled={loading}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}