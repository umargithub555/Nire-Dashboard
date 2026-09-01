'use client'
import dynamic from 'next/dynamic'
import { useState, useEffect, useMemo } from 'react'
import { format } from 'date-fns'
import { 
  MapPin, 
  Calendar, 
  FileSpreadsheet, 
  User, 
  Building2, 
  Search, 
  Map, 
  CheckCircle2, 
  Compass,
  Briefcase,
  Users
} from 'lucide-react'
import { Branch, Employee, Visit } from '@/types'

const MapModal = dynamic(() => import('@/components/ui/MapModal'), {
  ssr: false,
})

type VisitRecord = Visit & {
  employee?: {
    id: string
    full_name: string
    designation: string | null
    phone: string | null
    avatar_url: string | null
    branch_id: string | null
    branch?: {
      id: string
      name: string
    } | null
  } | null
}

export default function VisitsPage() {
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [branchFilter, setBranchFilter] = useState('')
  const [employeeFilter, setEmployeeFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  
  const [branches, setBranches] = useState<Branch[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [visits, setVisits] = useState<VisitRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<VisitRecord | null>(null)

  // Load initial branches and employees
  useEffect(() => {
    fetch('/api/branches')
      .then(r => r.json())
      .then(data => setBranches(Array.isArray(data) ? data : []))
      .catch(() => setBranches([]))

    fetch('/api/employees')
      .then(r => r.json())
      .then(data => setEmployees(Array.isArray(data) ? data : []))
      .catch(() => setEmployees([]))
  }, [])

  // Filter employees dropdown if a branch filter is selected
  const availableEmployees = useMemo(() => {
    if (!branchFilter) return employees
    return employees.filter(e => e.branch_id === branchFilter)
  }, [employees, branchFilter])

  // Reset employee filter if selected employee doesn't belong to selected branch
  useEffect(() => {
    if (employeeFilter && branchFilter) {
      const match = employees.find(e => e.id === employeeFilter && e.branch_id === branchFilter)
      if (!match) setEmployeeFilter('')
    }
  }, [branchFilter, employeeFilter, employees])

  // Fetch visits whenever filters change
  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    
    if (viewMode === 'daily' && date) {
      params.set('date', date)
    } else if (viewMode === 'monthly' && month) {
      params.set('month', month)
    }

    if (branchFilter) params.set('branch_id', branchFilter)
    if (employeeFilter) params.set('employee_id', employeeFilter)

    fetch(`/api/visits?${params}`)
      .then(r => r.json())
      .then(data => {
        setVisits(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => {
        setVisits([])
        setLoading(false)
      })
  }, [viewMode, date, month, branchFilter, employeeFilter])

  // Client-side text search filter
  const filteredVisits = useMemo(() => {
    if (!searchQuery.trim()) return visits
    const q = searchQuery.toLowerCase().trim()
    return visits.filter(v => 
      (v.employee?.full_name && v.employee.full_name.toLowerCase().includes(q)) ||
      (v.place_name && v.place_name.toLowerCase().includes(q)) ||
      (v.purpose && v.purpose.toLowerCase().includes(q)) ||
      (v.address && v.address.toLowerCase().includes(q)) ||
      (v.notes && v.notes.toLowerCase().includes(q))
    )
  }, [visits, searchQuery])

  // Metrics summary
  const summary = useMemo(() => {
    const total = filteredVisits.length
    const uniqueEmployees = new Set(filteredVisits.map(v => v.employee_id)).size
    const uniquePlaces = new Set(filteredVisits.map(v => (v.place_name || v.address || '').trim()).filter(Boolean)).size
    return { total, uniqueEmployees, uniquePlaces }
  }, [filteredVisits])

  // Selected employee metadata if single employee selected
  const selectedEmployeeObj = useMemo(() => {
    if (!employeeFilter) return null
    return employees.find(e => e.id === employeeFilter) || null
  }, [employeeFilter, employees])

  return (
    <div className="space-y-5 lg:space-y-6">
      {/* ── Header & View Mode Switcher ── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-zinc-900 tracking-tight">Visit Logs</h1>
          <p className="text-xs lg:text-sm text-zinc-500 mt-0.5">
            Field visits, client meetings, and training check-in logs
          </p>
        </div>

        {/* View Mode Switcher (Daily vs Monthly) */}
        <div className="inline-flex bg-zinc-100 p-1 rounded-xl border border-zinc-200/80 self-start lg:self-auto shadow-xs">
          <button
            onClick={() => setViewMode('daily')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'daily'
                ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200/50'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Calendar size={14} className={viewMode === 'daily' ? 'text-blue-600' : ''} />
            Daily Log
          </button>
          <button
            onClick={() => setViewMode('monthly')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'monthly'
                ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200/50'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <FileSpreadsheet size={14} className={viewMode === 'monthly' ? 'text-blue-600' : ''} />
            Monthly History
          </button>
        </div>
      </div>

      {/* ── Summary KPI Cards ── */}
      {/* <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 lg:gap-4">
        <div className="bg-white border border-zinc-200/80 rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Total Recorded Visits</div>
            <div className="text-2xl font-bold text-zinc-900 mt-1">{summary.total}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <MapPin size={20} />
          </div>
        </div>

        <div className="bg-white border border-zinc-200/80 rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Active Field Staff</div>
            <div className="text-2xl font-bold text-zinc-900 mt-1">{summary.uniqueEmployees}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <Users size={20} />
          </div>
        </div>

        <div className="bg-white border border-zinc-200/80 rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Unique Locations</div>
            <div className="text-2xl font-bold text-zinc-900 mt-1">{summary.uniquePlaces}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <Compass size={20} />
          </div>
        </div>
      </div> */}

      {/* ── Filters Bar ── */}
      <div className="bg-white border border-zinc-200/80 rounded-xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Date or Month Picker */}
          <div>
            <label className="block text-xs font-semibold text-zinc-600 mb-1.5 uppercase tracking-wider">
              {viewMode === 'daily' ? 'Select Date' : 'Select Month'}
            </label>
            {viewMode === 'daily' ? (
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium text-zinc-800 transition-all cursor-pointer shadow-xs"
                />
              </div>
            ) : (
              <div className="relative">
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium text-zinc-800 transition-all cursor-pointer shadow-xs"
                />
              </div>
            )}
          </div>

          {/* Branch Filter */}
          <div>
            <label className="block text-xs font-semibold text-zinc-600 mb-1.5 uppercase tracking-wider">
              Branch Filter
            </label>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white text-zinc-800 transition-all cursor-pointer shadow-xs"
            >
              <option value="">All branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Employee Filter */}
          <div>
            <label className="block text-xs font-semibold text-zinc-600 mb-1.5 uppercase tracking-wider">
              Select Employee
            </label>
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium text-zinc-800 transition-all cursor-pointer shadow-xs"
            >
              <option value="">All employees</option>
              {availableEmployees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.full_name} {e.designation ? `(${e.designation})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Search */}
          <div>
            <label className="block text-xs font-semibold text-zinc-600 mb-1.5 uppercase tracking-wider">
              Search Keywords
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search place, purpose, address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white placeholder:text-zinc-400 transition-all shadow-xs"
              />
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            </div>
          </div>
        </div>

        {/* Selected Employee Month Indicator Banner */}
        {selectedEmployeeObj && viewMode === 'monthly' && (
          <div className="mt-2 pt-3 border-t border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs bg-blue-50/60 p-2.5 rounded-lg border border-blue-100">
            <div className="flex items-center gap-2 font-medium text-blue-900">
              <User size={14} className="text-blue-600" />
              <span>
                Showing complete monthly log for <strong className="font-semibold">{selectedEmployeeObj.full_name}</strong> in {format(new Date(`${month}-01`), 'MMMM yyyy')}
              </span>
            </div>
            <span className="font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full self-start sm:self-auto">
              {filteredVisits.length} {filteredVisits.length === 1 ? 'Visit' : 'Visits'} Recorded
            </span>
          </div>
        )}
      </div>

      {/* ── Visits Cards List ── */}
      <div className="space-y-3.5">
        {loading ? (
          <div className="bg-white border border-zinc-200 rounded-xl px-6 py-12 text-center text-zinc-400 text-sm">
            <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
            <div>Loading visits...</div>
          </div>
        ) : filteredVisits.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-xl px-6 py-12 text-center text-zinc-400 text-sm">
            <MapPin size={28} className="mx-auto mb-2 text-zinc-300 stroke-[1.5]" />
            <div className="font-medium text-zinc-600 text-base">No visits found</div>
            <div className="text-xs text-zinc-400 mt-1">
              Try adjusting the date, branch, or employee filters above.
            </div>
          </div>
        ) : (
          filteredVisits.map((v) => {
            const visitDate = new Date(v.visited_at)
            return (
              <div
                key={v.id}
                className="group bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl p-4 sm:p-5 shadow-xs hover:shadow-sm transition-all duration-200"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  {/* Employee & Branch Info */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm shrink-0 shadow-xs">
                      {v.employee?.full_name
                        ? v.employee.full_name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()
                        : 'EM'}
                    </div>
                    <div>
                      <div className="font-semibold text-zinc-900 text-sm sm:text-base leading-snug">
                        {v.employee?.full_name || 'Unknown Employee'}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-zinc-500">
                        {v.employee?.designation && (
                          <span className="flex items-center gap-1">
                            <Briefcase size={12} className="text-zinc-400" />
                            {v.employee.designation}
                          </span>
                        )}
                        {v.employee?.branch?.name && (
                          <span className="inline-flex items-center gap-1 bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-md font-medium text-[11px]">
                            <Building2 size={11} className="text-zinc-500" />
                            {v.employee.branch.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Visit Date and Time */}
                  <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-100 flex sm:flex-col justify-between sm:justify-start items-center sm:items-end">
                    <div className="text-xs sm:text-sm font-semibold text-zinc-800">
                      {format(visitDate, 'EEE, MMM d, yyyy')}
                    </div>
                    <div className="text-xs text-zinc-400 font-medium sm:mt-0.5">
                      {format(visitDate, 'hh:mm a')}
                    </div>
                  </div>
                </div>

                {/* Visit Details Box */}
                <div className="mt-3.5 pt-3.5 border-t border-zinc-100 space-y-2.5">
                  {/* Place Name and Purpose Tag */}
                  <div className="flex flex-wrap items-center gap-2">
                    {v.place_name && (
                      <span className="font-semibold text-zinc-900 text-sm">
                        {v.place_name}
                      </span>
                    )}
                    {v.purpose && (
                      <span className="bg-blue-50 text-blue-700 border border-blue-200/60 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                        {v.purpose}
                      </span>
                    )}
                  </div>

                  {/* Full Location Address & Map Button */}
                  {v.address && (
                    <div className="flex items-start gap-2 text-xs text-zinc-600 bg-zinc-50/80 p-2.5 rounded-lg border border-zinc-150">
                      <MapPin size={15} className="text-blue-600 mt-0.5 shrink-0" />
                      <div className="flex-1 leading-relaxed">
                        <span>{v.address}</span>
                      </div>
                      {typeof v.lat === 'number' && typeof v.lng === 'number' && (
                        <button
                          onClick={() => setSelectedRecord(v)}
                          className="shrink-0 flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-600 hover:text-blue-700 text-xs font-semibold rounded-md border border-zinc-200 hover:border-blue-200 transition-colors shadow-2xs cursor-pointer active:scale-95"
                          title="Open Interactive Map"
                        >
                          <Map size={12} />
                          Map
                        </button>
                      )}
                    </div>
                  )}

                  {/* Visit Notes */}
                  {v.notes && (
                    <div className="text-xs text-zinc-500 bg-amber-50/50 border border-amber-200/50 rounded-lg p-2 leading-relaxed">
                      <span className="font-semibold text-amber-900">Notes: </span>
                      {v.notes}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ── Interactive Map Modal ── */}
      <MapModal
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        lat={selectedRecord?.lat ?? 0}
        lng={selectedRecord?.lng ?? 0}
        address={selectedRecord?.address ?? ''}
        employeeName={selectedRecord?.employee?.full_name || 'Employee Visit'}
        branchName={selectedRecord?.employee?.branch?.name || ''}
      />
    </div>
  )
}
