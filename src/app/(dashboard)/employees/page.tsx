'use client'
import { useState, useEffect } from 'react'
import { Plus, Eye, EyeOff, Pencil, Trash2, Phone, Building2, Briefcase } from 'lucide-react'
import { Employee, Branch } from '@/types'
import toast from 'react-hot-toast'

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null)
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({
    full_name: '', email: '', password: '',
    phone: '', designation: '', branch_id: '',
    salary: '',
    is_active: true
  })

  async function load() {
    const [emp, br] = await Promise.all([
      fetch('/api/employees').then(r => r.json()),
      fetch('/api/branches').then(r => r.json()),
    ])
    setEmployees(emp)
    setBranches(br)
  }

  useEffect(() => { load() }, [])

  function handleOpenEdit(emp: Employee) {
    setEditEmployee(emp)
    setForm({
      full_name: emp.full_name,
      email: emp.email,
      password: '',
      phone: emp.phone || '',
      designation: emp.designation || '',
      branch_id: emp.branch_id || '',
      salary: emp.salary !== undefined && emp.salary !== null ? String(emp.salary) : '',
      is_active: emp.is_active
    })
    setShowModal(true)
  }

  function handleCloseModal() {
    setShowModal(false)
    setEditEmployee(null)
    setShowPassword(false)
    setForm({ full_name: '', email: '', password: '', phone: '', designation: '', branch_id: '', salary: '', is_active: true })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const isEdit = !!editEmployee
    const url = isEdit ? `/api/employees?id=${editEmployee.id}` : '/api/employees'
    const method = isEdit ? 'PUT' : 'POST'

    const payload = { ...form }
    if (isEdit) delete (payload as any).password

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      toast.success(isEdit ? 'Employee updated' : 'Employee created — credentials sent')
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
    const res = await fetch(`/api/employees?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Employee deleted')
      setEmployeeToDelete(null)
      load()
    } else {
      const err = await res.json()
      toast.error(err.error)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-5 lg:space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-semibold text-zinc-900">Employees</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{employees.length} members</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all shadow-sm active:scale-95"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Add employee</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {/* ── Desktop table (hidden on mobile) ── */}
      <div className="hidden lg:block bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-150 bg-zinc-50/50">
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Name</th>
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Branch</th>
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Designation</th>
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Monthly Salary</th>
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Phone</th>
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
              <th className="text-right px-6 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {employees.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-10 text-zinc-400">No employees found</td>
              </tr>
            )}
            {employees.map((emp: any) => (
              <tr key={emp.id} className="hover:bg-zinc-50/75 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xs shadow-sm">
                      {emp.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-zinc-800 leading-tight">{emp.full_name}</div>
                      <div className="text-zinc-400 text-xs mt-0.5">{emp.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-zinc-600 font-medium">{emp.branch?.name ?? '—'}</td>
                <td className="px-6 py-4 text-zinc-600 font-medium">{emp.designation ?? '—'}</td>
                <td className="px-6 py-4 text-zinc-800 font-semibold">
                  {emp.salary ? `₨ ${Number(emp.salary).toLocaleString('en-PK')}` : '—'}
                </td>
                <td className="px-6 py-4 text-zinc-500">{emp.phone ?? '—'}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                    emp.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50' : 'bg-zinc-100 text-zinc-500 border border-zinc-200/30'
                  }`}>
                    {emp.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => handleOpenEdit(emp)} className="p-1.5 hover:bg-zinc-100 rounded-md text-zinc-500 hover:text-zinc-800 transition-colors" title="Edit">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => setEmployeeToDelete(emp)} className="p-1.5 hover:bg-red-50 rounded-md text-zinc-500 hover:text-red-600 transition-colors" title="Delete">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile card list (hidden on desktop) ── */}
      <div className="lg:hidden space-y-3">
        {employees.length === 0 && (
          <div className="bg-white border border-zinc-200 rounded-xl py-10 text-center text-sm text-zinc-400">
            No employees found
          </div>
        )}
        {employees.map((emp: any) => (
          <div key={emp.id} className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm shrink-0">
                  {emp.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-zinc-800 truncate">{emp.full_name}</div>
                  <div className="text-xs text-zinc-400 truncate">{emp.email}</div>
                </div>
              </div>
              <span className={`shrink-0 inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                emp.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50' : 'bg-zinc-100 text-zinc-500 border border-zinc-200/30'
              }`}>
                {emp.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div className="mt-3 space-y-1.5">
              {emp.branch?.name && (
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <Building2 size={12} className="text-zinc-400" />
                  {emp.branch.name}
                </div>
              )}
              {emp.designation && (
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <Briefcase size={12} className="text-zinc-400" />
                  {emp.designation}
                </div>
              )}
              {emp.salary ? (
                <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold">
                  <span>₨</span>
                  {Number(emp.salary).toLocaleString('en-PK')} / month
                </div>
              ) : null}
              {emp.phone && (
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <Phone size={12} className="text-zinc-400" />
                  {emp.phone}
                </div>
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-zinc-100 flex gap-2">
              <button
                onClick={() => handleOpenEdit(emp)}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-zinc-600 bg-zinc-50 hover:bg-zinc-100 rounded-lg transition-colors border border-zinc-200"
              >
                <Pencil size={13} /> Edit
              </button>
              <button
                onClick={() => setEmployeeToDelete(emp)}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
              >
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 max-h-[92vh] overflow-y-auto shadow-xl">
            <h2 className="font-semibold text-zinc-900 text-lg mb-5">{editEmployee ? 'Edit employee' : 'Add employee'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { key: 'full_name', label: 'Full name', type: 'text', placeholder: 'Ahmad Khan' },
                { key: 'email', label: 'Email', type: 'email', placeholder: 'ahmad@company.com' },
                ...(editEmployee ? [] : [{ key: 'password', label: 'Temporary password', type: 'password', placeholder: 'Min 6 characters' }]),
                { key: 'designation', label: 'Designation', type: 'text', placeholder: 'e.g. Branch Manager' },
                { key: 'salary', label: 'Monthly Salary (PKR)', type: 'number', placeholder: 'e.g. 50000' },
                { key: 'phone', label: 'Phone', type: 'tel', placeholder: '+92 300 0000000' },
              ].map(({ key, label, type, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">{label}</label>
                  {key === 'password' ? (
                    <div className="relative">
                      <input type={showPassword ? 'text' : 'password'} value={(form as any)[key]} placeholder={placeholder}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                        className="w-full pl-3 pr-10 py-2.5 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors focus:outline-none">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  ) : (
                    <input type={type} value={(form as any)[key]} placeholder={placeholder}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      required={['full_name', 'email'].includes(key)}
                    />
                  )}
                </div>
              ))}

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Branch</label>
                <select value={form.branch_id} onChange={e => setForm(f => ({ ...f, branch_id: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  required>
                  <option value="">Select branch</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              {editEmployee && (
                <div className="flex items-center gap-2.5 py-1">
                  <input type="checkbox" id="is_active" checked={form.is_active}
                    onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 border-zinc-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-zinc-700 cursor-pointer select-none">
                    Active Employee Status
                  </label>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={handleCloseModal}
                  className="flex-1 py-2.5 border border-zinc-200 rounded-lg text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
                  {loading ? (editEmployee ? 'Saving…' : 'Creating…') : (editEmployee ? 'Save changes' : 'Create employee')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {employeeToDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-6 shadow-xl">
            <h3 className="font-semibold text-zinc-900 text-lg mb-2">Delete Employee</h3>
            <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-zinc-800">"{employeeToDelete.full_name}"</span>? This will permanently delete their account and data.
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setEmployeeToDelete(null)}
                className="flex-1 py-2.5 border border-zinc-200 rounded-lg text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors">
                Cancel
              </button>
              <button type="button" onClick={() => handleDelete(employeeToDelete.id)} disabled={loading}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}