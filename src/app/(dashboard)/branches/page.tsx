'use client'
import { useState, useEffect } from 'react'
import { Plus, Building2, Pencil, Trash2 } from 'lucide-react'
import { Branch } from '@/types'
import toast from 'react-hot-toast'

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editBranch, setEditBranch] = useState<Branch | null>(null)
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null)
  const [form, setForm] = useState({ name: '', address: '' })
  const [loading, setLoading] = useState(false)

  async function load() {
    const res = await fetch('/api/branches')
    setBranches(await res.json())
  }

  useEffect(() => { load() }, [])

  function handleOpenEdit(branch: Branch) {
    setEditBranch(branch)
    setForm({ name: branch.name, address: branch.address || '' })
    setShowModal(true)
  }

  function handleCloseModal() {
    setShowModal(false)
    setEditBranch(null)
    setForm({ name: '', address: '' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const isEdit = !!editBranch
    const url = isEdit ? `/api/branches?id=${editBranch.id}` : '/api/branches'
    const method = isEdit ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
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

  return (
    <div className="space-y-5 lg:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-semibold text-zinc-900">Branches</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{branches.length} branch{branches.length !== 1 ? 'es' : ''}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all shadow-sm active:scale-95"
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
                {/* Actions: always visible on mobile, hover on desktop */}
                <div className="flex gap-1.5 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={() => handleOpenEdit(branch)}
                    className="p-1.5 hover:bg-zinc-100 rounded-md text-zinc-500 hover:text-zinc-800 transition-colors"
                    title="Edit Branch"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setBranchToDelete(branch)}
                    className="p-1.5 hover:bg-red-50 rounded-md text-zinc-500 hover:text-red-600 transition-colors"
                    title="Delete Branch"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <div className="font-semibold text-zinc-900 text-base lg:text-lg leading-snug">{branch.name}</div>
              {branch.address && <div className="text-sm text-zinc-500 mt-1.5 line-clamp-2 leading-relaxed">{branch.address}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 sm:p-6 shadow-xl">
            <h2 className="font-semibold text-zinc-900 text-lg mb-5">{editBranch ? 'Edit branch' : 'Add branch'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Branch name</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="e.g. Rawalpindi Main"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Address</label>
                <textarea
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none h-20"
                  placeholder="Street address"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={handleCloseModal}
                  className="flex-1 py-2.5 border border-zinc-200 rounded-lg text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
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
                className="flex-1 py-2.5 border border-zinc-200 rounded-lg text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(branchToDelete.id)}
                disabled={loading}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
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