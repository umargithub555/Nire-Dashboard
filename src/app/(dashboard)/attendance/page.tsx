'use client'
import dynamic from 'next/dynamic'
import { useState, useEffect, useMemo } from 'react'
import { format } from 'date-fns'
import {
  MapPin,
  Clock,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Users,
  Calendar,
  DollarSign,
  ChevronRight,
  X,
  Building2,
  CalendarDays,
  FileSpreadsheet,
  Download,
} from 'lucide-react'
import { Attendance, Branch, Employee } from '@/types'
import { evaluateAttendance, AttendanceAnalysis } from '@/lib/attendance-calculator'
import { generateMonthlyAttendancePdf } from '@/lib/pdf-export'

const MapModal = dynamic(() => import('@/components/ui/MapModal'), {
  ssr: false,
})

type AttendanceRecord = Attendance & {
  employee?: Attendance['employee'] & {
    id?: string
    salary?: number | null
    branch?: Branch | null
  }
}

type SelectedLocation = {
  lat: number
  lng: number
  address: string
  employeeName: string
  branchName: string
}

type EmployeeMonthlySummary = {
  employee: Employee
  daysPresent: number
  lateDays: number
  totalLateHours: number
  earlyDays: number
  totalEarlyHours: number
  totalHoursDeducted: number
  totalDeductions: number
  baseSalary: number
  netSalary: number
  records: {
    record: AttendanceRecord
    analysis: AttendanceAnalysis
  }[]
}

export default function AttendancePage() {
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [branchFilter, setBranchFilter] = useState<string>('')
  const [branches, setBranches] = useState<Branch[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])

  // Daily records
  const [dailyAttendance, setDailyAttendance] = useState<AttendanceRecord[]>([])

  // Monthly records
  const [monthlyAttendance, setMonthlyAttendance] = useState<AttendanceRecord[]>([])

  // Selected for map
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null)

  // Selected employee for monthly breakdown modal
  const [selectedEmployeeMonthly, setSelectedEmployeeMonthly] = useState<EmployeeMonthlySummary | null>(null)

  useEffect(() => {
    fetch('/api/branches').then(r => r.json()).then(setBranches)
    fetch('/api/employees').then(r => r.json()).then(setEmployees)
  }, [])

  // Fetch daily attendance
  useEffect(() => {
    const params = new URLSearchParams({ date })
    if (branchFilter) params.set('branch_id', branchFilter)
    fetch(`/api/attendance?${params}`).then(r => r.json()).then(setDailyAttendance)
  }, [date, branchFilter])

  // Fetch monthly attendance
  useEffect(() => {
    const params = new URLSearchParams({ month })
    if (branchFilter) params.set('branch_id', branchFilter)
    fetch(`/api/attendance?${params}`).then(r => r.json()).then(setMonthlyAttendance)
  }, [month, branchFilter])

  function openMap(record: AttendanceRecord, type: 'checkin' | 'checkout') {
    const isCheckIn = type === 'checkin'
    const lat = isCheckIn ? record.clock_in_lat : record.clock_out_lat
    const lng = isCheckIn ? record.clock_in_lng : record.clock_out_lng
    const address = isCheckIn ? record.clock_in_address : record.clock_out_address

    if (lat === null || lng === null || !address) return

    setSelectedLocation({
      lat,
      lng,
      address,
      employeeName: `${record.employee?.full_name ?? 'Employee'} ${isCheckIn ? 'check-in' : 'check-out'}`,
      branchName: record.employee?.branch?.name ?? 'Branch',
    })
  }

  // Daily Summary Metrics
  const dailySummary = useMemo(() => {
    let onTimeCount = 0
    let lateCount = 0
    let earlyCount = 0
    let totalDeductions = 0

    dailyAttendance.forEach(record => {
      const evaluation = evaluateAttendance(
        record.clock_in_at,
        record.clock_out_at,
        record.employee?.branch,
        record.employee?.salary
      )

      if (evaluation.isLate) lateCount++
      if (evaluation.isEarly) earlyCount++
      if (!evaluation.isLate && (!evaluation.isEarly || !record.clock_out_at)) onTimeCount++
      totalDeductions += evaluation.totalDeductionAmount
    })

    return {
      total: dailyAttendance.length,
      onTimeCount,
      lateCount,
      earlyCount,
      totalDeductions,
    }
  }, [dailyAttendance])

  // Monthly Aggregated Summaries per Employee
  const monthlySummaryList = useMemo<EmployeeMonthlySummary[]>(() => {
    // Filter employees by branch if filter active
    const filteredEmployees = branchFilter
      ? employees.filter(e => e.branch_id === branchFilter)
      : employees

    return filteredEmployees.map(emp => {
      // Find all records for this employee in the month
      const empRecords = monthlyAttendance.filter(
        rec => rec.employee_id === emp.id || (rec.employee as any)?.id === emp.id
      )

      let lateDays = 0
      let totalLateHours = 0
      let earlyDays = 0
      let totalEarlyHours = 0
      let totalDeductions = 0

      const evaluatedRecords = empRecords.map(record => {
        const analysis = evaluateAttendance(
          record.clock_in_at,
          record.clock_out_at,
          record.employee?.branch || emp.branch,
          emp.salary
        )

        if (analysis.isLate) {
          lateDays++
          totalLateHours += analysis.lateHoursDeducted
        }
        if (analysis.isEarly) {
          earlyDays++
          totalEarlyHours += analysis.earlyHoursDeducted
        }
        totalDeductions += analysis.totalDeductionAmount

        return { record, analysis }
      })

      const baseSalary = Number(emp.salary) || 0
      const netSalary = Math.max(0, baseSalary - totalDeductions)
      const totalHoursDeducted = totalLateHours + totalEarlyHours

      return {
        employee: emp,
        daysPresent: empRecords.length,
        lateDays,
        totalLateHours,
        earlyDays,
        totalEarlyHours,
        totalHoursDeducted,
        totalDeductions,
        baseSalary,
        netSalary,
        records: evaluatedRecords.sort((a, b) => b.record.date.localeCompare(a.record.date)),
      }
    })
  }, [employees, monthlyAttendance, branchFilter])

  // Monthly Overview Totals
  const monthlyTotals = useMemo(() => {
    let totalBasePayroll = 0
    let totalDeductions = 0
    let totalNetPayroll = 0
    let totalLateIncidents = 0
    let totalEarlyIncidents = 0

    monthlySummaryList.forEach(item => {
      totalBasePayroll += item.baseSalary
      totalDeductions += item.totalDeductions
      totalNetPayroll += item.netSalary
      totalLateIncidents += item.lateDays
      totalEarlyIncidents += item.earlyDays
    })

    return {
      totalEmployees: monthlySummaryList.length,
      totalBasePayroll,
      totalDeductions,
      totalNetPayroll,
      totalLateIncidents,
      totalEarlyIncidents,
    }
  }, [monthlySummaryList])

  function handleDownloadMonthlyPdf() {
    const selectedBranchObj = branches.find((b) => b.id === branchFilter)
    const branchName = selectedBranchObj ? selectedBranchObj.name : 'All Branches'

    generateMonthlyAttendancePdf({
      monthStr: month,
      branchName,
      summaries: monthlySummaryList,
    })
  }

  return (
    <>
      <div className="space-y-5 lg:space-y-6">
        {/* Top Header & View Mode Switcher */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl lg:text-2xl font-semibold text-zinc-900">
              Attendance & Payroll
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              {viewMode === 'daily'
                ? `Daily records for ${format(new Date(date + 'T00:00:00'), 'MMMM d, yyyy')}`
                : `Monthly payroll & attendance report for ${format(new Date(month + '-01T00:00:00'), 'MMMM yyyy')}`}
            </p>
          </div>

          {/* View Mode Tabs */}
          <div className="inline-flex bg-zinc-100 p-1 rounded-xl border border-zinc-200/80 self-start sm:self-auto">
            <button
              onClick={() => setViewMode('daily')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'daily'
                  ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200/50'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Calendar size={14} />
              Daily Workday
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'monthly'
                  ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200/50'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <FileSpreadsheet size={14} />
              Monthly Payroll
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {viewMode === 'daily' ? (
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          ) : (
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium text-zinc-800"
            />
          )}

          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.office_start_time?.slice(0, 5) || '09:00'} - {b.office_end_time?.slice(0, 5) || '17:00'})
              </option>
            ))}
          </select>

          {viewMode === 'monthly' && (
            <button
              onClick={handleDownloadMonthlyPdf}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold rounded-lg transition-all shadow-sm sm:ml-auto cursor-pointer"
            >
              <Download size={16} />
              Download Monthly PDF Report
            </button>
          )}
        </div>

        {/* ========================================================= */}
        {/* DAILY VIEW                                                */}
        {/* ========================================================= */}
        {viewMode === 'daily' && (
          <>
            {/* Daily Summary Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between text-zinc-500 mb-1.5">
                  <span className="text-xs font-medium uppercase tracking-wider">Total Present</span>
                  <Users size={16} className="text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-zinc-900">{dailySummary.total}</div>
                <div className="text-xs text-zinc-400 mt-1">Logged attendance today</div>
              </div>

              <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between text-emerald-600 mb-1.5">
                  <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">On Time</span>
                  <CheckCircle2 size={16} className="text-emerald-600" />
                </div>
                <div className="text-2xl font-bold text-emerald-600">{dailySummary.onTimeCount}</div>
                <div className="text-xs text-zinc-400 mt-1">Within 20m grace period</div>
              </div>

              <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between text-amber-600 mb-1.5">
                  <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Late Arrivals</span>
                  <AlertTriangle size={16} className="text-amber-500" />
                </div>
                <div className="text-2xl font-bold text-amber-600">{dailySummary.lateCount}</div>
                <div className="text-xs text-zinc-400 mt-1">After branch grace period</div>
              </div>

              <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between text-rose-600 mb-1.5">
                  <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Est. Deductions</span>
                  <TrendingDown size={16} className="text-rose-500" />
                </div>
                <div className="text-2xl font-bold text-rose-600">
                  ₨ {dailySummary.totalDeductions.toLocaleString('en-PK')}
                </div>
                <div className="text-xs text-zinc-400 mt-1">
                  {dailySummary.earlyCount} early checkout{dailySummary.earlyCount === 1 ? '' : 's'}
                </div>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/50">
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                      Employee
                    </th>
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                      Branch & Hours
                    </th>
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                      Check-in
                    </th>
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                      Check-out
                    </th>
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                      Workday Status
                    </th>
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                      Deduction
                    </th>
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                      Location
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-50">
                  {dailyAttendance.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-10 text-center text-zinc-400 text-sm"
                      >
                        No attendance records found for this date.
                      </td>
                    </tr>
                  )}

                  {dailyAttendance.map((record) => {
                    const evalResult = evaluateAttendance(
                      record.clock_in_at,
                      record.clock_out_at,
                      record.employee?.branch,
                      record.employee?.salary
                    )

                    return (
                      <tr
                        key={record.id}
                        className="hover:bg-zinc-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="font-semibold text-zinc-800 leading-tight">
                            {record.employee?.full_name}
                          </div>
                          <div className="text-zinc-400 text-xs mt-0.5">
                            {record.employee?.designation}
                            {record.employee?.salary ? (
                              <span className="text-emerald-600 font-medium ml-1.5">
                                · ₨ {Number(record.employee.salary).toLocaleString('en-PK')}
                              </span>
                            ) : null}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="font-medium text-zinc-700">
                            {record.employee?.branch?.name || '—'}
                          </div>
                          <div className="text-[11px] text-zinc-400 mt-0.5">
                            {record.employee?.branch?.office_start_time?.slice(0, 5) || '09:00'} - {record.employee?.branch?.office_end_time?.slice(0, 5) || '17:00'}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-zinc-700">
                            <Clock size={13} className="text-zinc-400" />
                            <span className="font-medium">{format(new Date(record.clock_in_at), 'hh:mm a')}</span>
                          </div>
                          {evalResult.isLate ? (
                            <div className="text-[11px] text-amber-600 font-medium mt-0.5">
                              Late by {evalResult.lateMinutes} mins
                            </div>
                          ) : (
                            <div className="text-[11px] text-emerald-600 mt-0.5">
                              On time
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          {record.clock_out_at ? (
                            <div>
                              <div className="flex items-center gap-1.5 text-zinc-700">
                                <LogOut size={13} className="text-zinc-400" />
                                <span className="font-medium">{format(new Date(record.clock_out_at), 'hh:mm a')}</span>
                              </div>
                              {evalResult.isEarly ? (
                                <div className="text-[11px] text-rose-600 font-medium mt-0.5">
                                  Left {evalResult.earlyMinutes} mins early
                                </div>
                              ) : (
                                <div className="text-[11px] text-emerald-600 mt-0.5">
                                  Completed shift
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-zinc-400 text-xs">
                              Pending
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                            evalResult.statusTone === 'emerald'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                              : evalResult.statusTone === 'amber'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                              : evalResult.statusTone === 'rose'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                              : 'bg-red-50 text-red-700 border border-red-200/60'
                          }`}>
                            {evalResult.statusLabel}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          {evalResult.totalDeductionAmount > 0 ? (
                            <div>
                              <div className="font-semibold text-rose-600">
                                ₨ {evalResult.totalDeductionAmount.toLocaleString('en-PK')}
                              </div>
                              <div className="text-[11px] text-zinc-400 mt-0.5">
                                {evalResult.totalHoursDeducted} hr{evalResult.totalHoursDeducted === 1 ? '' : 's'} deducted
                              </div>
                            </div>
                          ) : (
                            <span className="text-zinc-400 text-xs">—</span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          {record.clock_in_address || record.clock_out_address ? (
                            <div className="space-y-2">
                              {record.clock_in_address && (
                                <div className="flex items-start gap-1.5">
                                  <MapPin
                                    size={13}
                                    className="text-zinc-400 mt-0.5 shrink-0"
                                  />

                                  <div>
                                    <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                                      Check-in
                                    </div>
                                    <div className="text-zinc-600 text-xs max-w-[200px] leading-relaxed truncate">
                                      {record.clock_in_address}
                                    </div>

                                    {record.clock_in_lat !== null && record.clock_in_lng !== null && (
                                      <button
                                        onClick={() => openMap(record, 'checkin')}
                                        className="text-blue-600 text-xs hover:underline mt-0.5 inline-flex items-center gap-1"
                                      >
                                        View map
                                        <MapPin size={11} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                              {record.clock_out_address && (
                                <div className="flex items-start gap-1.5">
                                  <MapPin
                                    size={13}
                                    className="text-zinc-400 mt-0.5 shrink-0"
                                  />

                                  <div>
                                    <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                                      Check-out
                                    </div>
                                    <div className="text-zinc-600 text-xs max-w-[200px] leading-relaxed truncate">
                                      {record.clock_out_address}
                                    </div>
                                    {record.clock_out_lat !== null && record.clock_out_lng !== null && (
                                      <button
                                        onClick={() => openMap(record, 'checkout')}
                                        className="text-blue-600 text-xs hover:underline mt-0.5 inline-flex items-center gap-1"
                                      >
                                        View map
                                        <MapPin size={11} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-zinc-400 text-xs">
                              No location
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Daily Cards */}
            <div className="lg:hidden space-y-3">
              {dailyAttendance.length === 0 && (
                <div className="bg-white border border-zinc-200 rounded-xl py-10 text-center text-sm text-zinc-400">
                  No attendance records found
                </div>
              )}

              {dailyAttendance.map((record) => {
                const evalResult = evaluateAttendance(
                  record.clock_in_at,
                  record.clock_out_at,
                  record.employee?.branch,
                  record.employee?.salary
                )

                return (
                  <div
                    key={record.id}
                    className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-zinc-800 truncate">
                          {record.employee?.full_name}
                        </div>
                        <div className="text-xs text-zinc-400 truncate">
                          {record.employee?.designation}
                          {record.employee?.branch?.name ? ` · ${record.employee.branch.name}` : ''}
                        </div>
                      </div>

                      <span className={`shrink-0 inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        evalResult.statusTone === 'emerald'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                          : evalResult.statusTone === 'amber'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                          : evalResult.statusTone === 'rose'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                          : 'bg-red-50 text-red-700 border border-red-200/60'
                      }`}>
                        {evalResult.statusLabel}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-100 text-xs">
                      <div>
                        <div className="text-zinc-400 font-medium">Check-in</div>
                        <div className="font-semibold text-zinc-700 mt-0.5">
                          {format(new Date(record.clock_in_at), 'hh:mm a')}
                        </div>
                        {evalResult.isLate ? (
                          <div className="text-[11px] text-amber-600 font-medium">
                            Late by {evalResult.lateMinutes}m
                          </div>
                        ) : (
                          <div className="text-[11px] text-emerald-600">On time</div>
                        )}
                      </div>

                      <div>
                        <div className="text-zinc-400 font-medium">Check-out</div>
                        <div className="font-semibold text-zinc-700 mt-0.5">
                          {record.clock_out_at ? format(new Date(record.clock_out_at), 'hh:mm a') : 'Pending'}
                        </div>
                        {record.clock_out_at && evalResult.isEarly ? (
                          <div className="text-[11px] text-rose-600 font-medium">
                            Left {evalResult.earlyMinutes}m early
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {evalResult.totalDeductionAmount > 0 && (
                      <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs">
                        <span className="text-zinc-500 font-medium">Est. Deduction ({evalResult.totalHoursDeducted} hr):</span>
                        <span className="font-bold text-rose-600">
                          ₨ {evalResult.totalDeductionAmount.toLocaleString('en-PK')}
                        </span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-zinc-100 space-y-2">
                      {record.clock_in_address && (
                        <div className="flex items-start gap-1.5">
                          <MapPin
                            size={13}
                            className="text-zinc-400 mt-0.5 shrink-0"
                          />

                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                              Check-in Location
                            </div>
                            <div className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                              {record.clock_in_address}
                            </div>

                            {record.clock_in_lat !== null && record.clock_in_lng !== null && (
                              <button
                                onClick={() => openMap(record, 'checkin')}
                                className="text-blue-600 text-[11px] font-semibold hover:underline mt-1 inline-flex items-center gap-1"
                              >
                                View on map
                                <MapPin size={10} />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                      {record.clock_out_address && (
                        <div className="flex items-start gap-1.5">
                          <LogOut
                            size={13}
                            className="text-zinc-400 mt-0.5 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                              Check-out Location
                            </div>
                            <div className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                              {record.clock_out_address}
                            </div>
                            {record.clock_out_lat !== null && record.clock_out_lng !== null && (
                              <button
                                onClick={() => openMap(record, 'checkout')}
                                className="text-blue-600 text-[11px] font-semibold hover:underline mt-1 inline-flex items-center gap-1"
                              >
                                View on map
                                <MapPin size={10} />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* ========================================================= */}
        {/* MONTHLY PAYROLL & SUMMARY VIEW                            */}
        {/* ========================================================= */}
        {viewMode === 'monthly' && (
          <>
            {/* Monthly Summary Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between text-zinc-500 mb-1.5">
                  <span className="text-xs font-medium uppercase tracking-wider">Base Payroll</span>
                  <DollarSign size={16} className="text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-zinc-900">
                  ₨ {monthlyTotals.totalBasePayroll.toLocaleString('en-PK')}
                </div>
                <div className="text-xs text-zinc-400 mt-1">
                  Across {monthlyTotals.totalEmployees} employee{monthlyTotals.totalEmployees === 1 ? '' : 's'}
                </div>
              </div>

              <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between text-rose-600 mb-1.5">
                  <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Total Deductions</span>
                  <TrendingDown size={16} className="text-rose-500" />
                </div>
                <div className="text-2xl font-bold text-rose-600">
                  ₨ {monthlyTotals.totalDeductions.toLocaleString('en-PK')}
                </div>
                <div className="text-xs text-zinc-400 mt-1">
                  {monthlyTotals.totalLateIncidents} late · {monthlyTotals.totalEarlyIncidents} early
                </div>
              </div>

              <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between text-emerald-600 mb-1.5">
                  <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Net Payable</span>
                  <CheckCircle2 size={16} className="text-emerald-600" />
                </div>
                <div className="text-2xl font-bold text-emerald-600">
                  ₨ {monthlyTotals.totalNetPayroll.toLocaleString('en-PK')}
                </div>
                <div className="text-xs text-zinc-400 mt-1">
                  Final salary after deductions
                </div>
              </div>

              <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between text-amber-600 mb-1.5">
                  <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Late Incidents</span>
                  <AlertTriangle size={16} className="text-amber-500" />
                </div>
                <div className="text-2xl font-bold text-amber-600">
                  {monthlyTotals.totalLateIncidents}
                </div>
                <div className="text-xs text-zinc-400 mt-1">
                  Days with check-in delay
                </div>
              </div>
            </div>

            {/* Monthly Employee Table */}
            <div className="hidden lg:block bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/50">
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                      Employee
                    </th>
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                      Branch
                    </th>
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                      Base Salary
                    </th>
                    <th className="text-center px-4 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                      Days Present
                    </th>
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                      Late / Early Days
                    </th>
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                      Deductions
                    </th>
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                      Net Payable
                    </th>
                    <th className="text-right px-6 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                      Details
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-50">
                  {monthlySummaryList.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-center text-zinc-400 text-sm">
                        No employees found for this month.
                      </td>
                    </tr>
                  )}

                  {monthlySummaryList.map((item) => (
                    <tr
                      key={item.employee.id}
                      onClick={() => setSelectedEmployeeMonthly(item)}
                      className="hover:bg-zinc-50/80 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-zinc-800 leading-tight">
                          {item.employee.full_name}
                        </div>
                        <div className="text-zinc-400 text-xs mt-0.5">
                          {item.employee.designation || 'Employee'}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-zinc-600 font-medium">
                        {item.employee.branch?.name || '—'}
                      </td>

                      <td className="px-6 py-4 font-semibold text-zinc-800">
                        {item.baseSalary > 0 ? `₨ ${item.baseSalary.toLocaleString('en-PK')}` : '—'}
                      </td>

                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/50">
                          {item.daysPresent} day{item.daysPresent === 1 ? '' : 's'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-xs">
                        {item.lateDays > 0 || item.earlyDays > 0 ? (
                          <div className="space-y-0.5">
                            {item.lateDays > 0 && (
                              <div className="text-amber-600 font-medium">
                                • {item.lateDays} late ({item.totalLateHours}h deducted)
                              </div>
                            )}
                            {item.earlyDays > 0 && (
                              <div className="text-rose-600 font-medium">
                                • {item.earlyDays} early ({item.totalEarlyHours}h deducted)
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-emerald-600 font-medium">All shifts on time</span>
                        )}
                      </td>

                      <td className="px-6 py-4 font-semibold text-rose-600">
                        {item.totalDeductions > 0 ? (
                          <div>
                            <div>- ₨ {item.totalDeductions.toLocaleString('en-PK')}</div>
                            <div className="text-[11px] text-zinc-400 font-normal">
                              ({item.totalHoursDeducted} hr{item.totalHoursDeducted === 1 ? '' : 's'})
                            </div>
                          </div>
                        ) : (
                          <span className="text-zinc-400 text-xs">₨ 0</span>
                        )}
                      </td>

                      <td className="px-6 py-4 font-bold text-emerald-600 text-base">
                        {item.baseSalary > 0 ? `₨ ${item.netSalary.toLocaleString('en-PK')}` : '—'}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedEmployeeMonthly(item)
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors border border-blue-200/60"
                        >
                          Breakdown
                          <ChevronRight size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Monthly Cards */}
            <div className="lg:hidden space-y-3">
              {monthlySummaryList.length === 0 && (
                <div className="bg-white border border-zinc-200 rounded-xl py-10 text-center text-sm text-zinc-400">
                  No employees found
                </div>
              )}

              {monthlySummaryList.map((item) => (
                <div
                  key={item.employee.id}
                  onClick={() => setSelectedEmployeeMonthly(item)}
                  className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm space-y-3 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-zinc-800">{item.employee.full_name}</div>
                      <div className="text-xs text-zinc-400">
                        {item.employee.designation} · {item.employee.branch?.name || '—'}
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/50">
                      {item.daysPresent} present
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-100 text-xs">
                    <div>
                      <span className="text-zinc-400">Base Salary:</span>
                      <div className="font-semibold text-zinc-800">
                        {item.baseSalary > 0 ? `₨ ${item.baseSalary.toLocaleString('en-PK')}` : '—'}
                      </div>
                    </div>
                    <div>
                      <span className="text-zinc-400">Net Payable:</span>
                      <div className="font-bold text-emerald-600">
                        {item.baseSalary > 0 ? `₨ ${item.netSalary.toLocaleString('en-PK')}` : '—'}
                      </div>
                    </div>
                  </div>

                  {(item.lateDays > 0 || item.earlyDays > 0) && (
                    <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs">
                      <div className="text-amber-600 font-medium">
                        {item.lateDays > 0 ? `${item.lateDays} late` : ''}
                        {item.lateDays > 0 && item.earlyDays > 0 ? ' · ' : ''}
                        {item.earlyDays > 0 ? `${item.earlyDays} early` : ''}
                      </div>
                      <div className="font-bold text-rose-600">
                        - ₨ {item.totalDeductions.toLocaleString('en-PK')}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs text-blue-600 font-semibold">
                    <span>View daily attendance breakdown</span>
                    <ChevronRight size={14} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ========================================================= */}
      {/* EMPLOYEE MONTHLY BREAKDOWN MODAL                          */}
      {/* ========================================================= */}
      {selectedEmployeeMonthly && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setSelectedEmployeeMonthly(null)}
        >
          <div
            className="relative h-[min(700px,90vh)] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-zinc-200 bg-white px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-zinc-900">
                  {selectedEmployeeMonthly.employee.full_name}
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Monthly Attendance & Deductions Breakdown · {format(new Date(month + '-01T00:00:00'), 'MMMM yyyy')}
                </p>
              </div>
              <button
                onClick={() => setSelectedEmployeeMonthly(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Summary Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-zinc-150 bg-zinc-50/70 p-4 text-xs">
              <div>
                <span className="text-zinc-400">Base Salary:</span>
                <div className="font-bold text-zinc-800 text-sm mt-0.5">
                  {selectedEmployeeMonthly.baseSalary > 0
                    ? `₨ ${selectedEmployeeMonthly.baseSalary.toLocaleString('en-PK')}`
                    : '—'}
                </div>
              </div>
              <div>
                <span className="text-zinc-400">Days Present:</span>
                <div className="font-bold text-blue-700 text-sm mt-0.5">
                  {selectedEmployeeMonthly.daysPresent} days
                </div>
              </div>
              <div>
                <span className="text-zinc-400">Total Deductions:</span>
                <div className="font-bold text-rose-600 text-sm mt-0.5">
                  {selectedEmployeeMonthly.totalDeductions > 0
                    ? `- ₨ ${selectedEmployeeMonthly.totalDeductions.toLocaleString('en-PK')}`
                    : '₨ 0'}
                </div>
              </div>
              <div>
                <span className="text-zinc-400">Net Salary:</span>
                <div className="font-bold text-emerald-600 text-sm mt-0.5">
                  {selectedEmployeeMonthly.baseSalary > 0
                    ? `₨ ${selectedEmployeeMonthly.netSalary.toLocaleString('en-PK')}`
                    : '—'}
                </div>
              </div>
            </div>

            {/* Daily Log List */}
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 p-2 sm:p-4">
              {selectedEmployeeMonthly.records.length === 0 ? (
                <div className="py-12 text-center text-sm text-zinc-400">
                  No attendance records recorded for this employee in {format(new Date(month + '-01T00:00:00'), 'MMMM yyyy')}.
                </div>
              ) : (
                selectedEmployeeMonthly.records.map(({ record, analysis }) => (
                  <div
                    key={record.id}
                    className="p-3 sm:p-4 hover:bg-zinc-50/80 rounded-xl transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-800 text-sm">
                          {format(new Date(record.date + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}
                        </span>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          analysis.statusTone === 'emerald'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            : analysis.statusTone === 'amber'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                            : analysis.statusTone === 'rose'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                            : 'bg-red-50 text-red-700 border border-red-200/60'
                        }`}>
                          {analysis.statusLabel}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500 mt-1.5">
                        <div className="flex items-center gap-1">
                          <Clock size={12} className="text-zinc-400" />
                          <span>In: {format(new Date(record.clock_in_at), 'hh:mm a')}</span>
                          {analysis.isLate ? (
                            <span className="text-amber-600 font-semibold">(Late by {analysis.lateMinutes}m)</span>
                          ) : (
                            <span className="text-emerald-600">(On time)</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <LogOut size={12} className="text-zinc-400" />
                          <span>Out: {record.clock_out_at ? format(new Date(record.clock_out_at), 'hh:mm a') : 'Pending'}</span>
                          {record.clock_out_at && analysis.isEarly ? (
                            <span className="text-rose-600 font-semibold">(Left {analysis.earlyMinutes}m early)</span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {analysis.totalDeductionAmount > 0 ? (
                      <div className="text-left sm:text-right shrink-0">
                        <div className="font-bold text-rose-600 text-sm">
                          - ₨ {analysis.totalDeductionAmount.toLocaleString('en-PK')}
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          {analysis.totalHoursDeducted} hr{analysis.totalHoursDeducted === 1 ? '' : 's'} deducted
                        </div>
                      </div>
                    ) : (
                      <div className="text-left sm:text-right shrink-0 text-xs font-semibold text-emerald-600">
                        No deduction
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-zinc-200 bg-zinc-50 p-3.5 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedEmployeeMonthly(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-900 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Map modal for location view */}
      <MapModal
        isOpen={!!selectedLocation}
        onClose={() => setSelectedLocation(null)}
        lat={selectedLocation?.lat ?? 0}
        lng={selectedLocation?.lng ?? 0}
        address={selectedLocation?.address ?? ''}
        employeeName={selectedLocation?.employeeName ?? 'Employee'}
        branchName={selectedLocation?.branchName ?? 'Branch'}
      />
    </>
  )
}
