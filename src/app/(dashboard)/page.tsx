import { createServiceClient } from '@/lib/supabase/server'
import { Users, Building2, ClipboardCheck, MapPin } from 'lucide-react'
import { format } from 'date-fns'

async function getStats() {
  const service = createServiceClient()
  const today = format(new Date(), 'yyyy-MM-dd')

  const [employees, branches, todayAttendance, recentVisits] = await Promise.all([
    service.from('employees').select('id', { count: 'exact' }).eq('is_active', true),
    service.from('branches').select('id', { count: 'exact' }),
    service.from('attendance').select('id', { count: 'exact' }).eq('date', today),
    service.from('visits').select('id', { count: 'exact' }),
  ])

  return {
    employees: employees.count ?? 0,
    branches: branches.count ?? 0,
    todayAttendance: todayAttendance.count ?? 0,
    totalVisits: recentVisits.count ?? 0,
  }
}

async function getRecentAttendance() {
  const service = createServiceClient()
  const today = format(new Date(), 'yyyy-MM-dd')
  const { data } = await service
    .from('attendance')
    .select('*, employee:employees(full_name, designation, branch:branches(name))')
    .eq('date', today)
    .order('clock_in_at', { ascending: false })
    .limit(8)
  return data ?? []
}

export default async function OverviewPage() {
  const [stats, attendance] = await Promise.all([getStats(), getRecentAttendance()])

  const statCards = [
    { label: 'Active employees', value: stats.employees, icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: 'Branches', value: stats.branches, icon: Building2, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Present today', value: stats.todayAttendance, icon: ClipboardCheck, color: 'bg-amber-50 text-amber-600' },
    { label: 'Total visits', value: stats.totalVisits, icon: MapPin, color: 'bg-violet-50 text-violet-600' },
  ]

  return (
    <div className="space-y-6 lg:space-y-8">
      <div>
        <h1 className="text-xl lg:text-2xl font-semibold text-zinc-900">Overview</h1>
        <p className="text-sm text-zinc-500 mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      {/* Stat cards — 2 cols on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-zinc-200 rounded-xl p-4 lg:p-5">
            <div className={`inline-flex p-2 rounded-lg ${color} mb-3`}>
              <Icon size={16} className="lg:hidden" />
              <Icon size={18} className="hidden lg:block" />
            </div>
            <div className="text-xl lg:text-2xl font-semibold text-zinc-900">{value}</div>
            <div className="text-xs lg:text-sm text-zinc-500 mt-0.5 leading-snug">{label}</div>
          </div>
        ))}
      </div>

      {/* Today's attendance */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
        <div className="px-4 lg:px-6 py-4 border-b border-zinc-100">
          <h2 className="font-medium text-zinc-900">Today's attendance</h2>
        </div>
        <div className="divide-y divide-zinc-50">
          {attendance.length === 0 && (
            <div className="px-4 lg:px-6 py-8 text-center text-sm text-zinc-400">No check-ins yet today</div>
          )}
          {attendance.map((a: any) => (
            <div key={a.id} className="px-4 lg:px-6 py-3 lg:py-3.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-zinc-800 truncate">{a.employee?.full_name}</div>
                <div className="text-xs text-zinc-400 truncate">{a.employee?.designation} · {a.employee?.branch?.name}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm text-zinc-700">{format(new Date(a.clock_in_at), 'hh:mm a')}</div>
                {a.clock_in_address && (
                  <div className="text-xs text-zinc-400 max-w-[140px] lg:max-w-[200px] truncate">{a.clock_in_address}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}