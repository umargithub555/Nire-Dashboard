import { createServiceClient } from '@/lib/supabase/server'
import { isWithinPolicyHoursAt, pakistanDayRange, todayDateString } from '@/lib/tracking'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const employeeId = searchParams.get('employee_id')
  const date = searchParams.get('date') ?? todayDateString()
  const month = searchParams.get('month') ?? date.slice(0, 7)

  if (!employeeId) return NextResponse.json({ error: 'employee_id is required' }, { status: 400 })
  if (!isDate(date) || !isMonth(month)) {
    return NextResponse.json({ error: 'Use date YYYY-MM-DD and month YYYY-MM.' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data: policy, error: policyError } = await service
    .from('tracking_policies')
    .select('office_start_time, office_end_time, timezone')
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (policyError) return NextResponse.json({ error: policyError.message }, { status: 500 })

  const activePolicy = policy ?? {
    office_start_time: '09:00',
    office_end_time: '17:00',
    timezone: 'Asia/Karachi',
  }
  const dayRange = pakistanDayRange(date)
  const monthRange = karachiMonthRange(month)

  const [employeeResult, dayAttendanceResult, monthAttendanceResult, dayVisitsResult, monthVisitsResult, daySamplesResult, monthSamplesResult] = await Promise.all([
    service
      .from('employees')
      .select('id, full_name, designation, branch:branches(id, name, address, office_start_time, office_end_time, grace_period_minutes, timezone)')
      .eq('id', employeeId)
      .maybeSingle(),
    service
      .from('attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('date', date)
      .maybeSingle(),
    service
      .from('attendance')
      .select('id, date, clock_in_at, clock_out_at')
      .eq('employee_id', employeeId)
      .gte('date', monthRange.startDate)
      .lte('date', monthRange.endDate),
    service
      .from('visits')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('visited_at', dayRange.start)
      .lt('visited_at', dayRange.end)
      .order('visited_at', { ascending: true }),
    service
      .from('visits')
      .select('id, address, place_name, visited_at')
      .eq('employee_id', employeeId)
      .gte('visited_at', monthRange.start)
      .lt('visited_at', monthRange.end),
    service
      .from('location_samples')
      .select('id, recorded_at, lat, lng, address, accuracy_meters, mocked, source')
      .eq('employee_id', employeeId)
      .gte('recorded_at', dayRange.start)
      .lt('recorded_at', dayRange.end)
      .order('recorded_at', { ascending: true }),
    service
      .from('location_samples')
      .select('id, address, recorded_at, source')
      .eq('employee_id', employeeId)
      .gte('recorded_at', monthRange.start)
      .lt('recorded_at', monthRange.end),
  ])

  const results = [employeeResult, dayAttendanceResult, monthAttendanceResult, dayVisitsResult, monthVisitsResult, daySamplesResult, monthSamplesResult]
  const failure = results.find((result) => result.error)
  if (failure?.error) return NextResponse.json({ error: failure.error.message }, { status: 500 })
  if (!employeeResult.data) return NextResponse.json({ error: 'Employee not found.' }, { status: 404 })

  const branch = employeeResult.data.branch as any
  const empPolicy = {
    office_start_time: branch?.office_start_time || policy?.office_start_time || '09:00',
    office_end_time: branch?.office_end_time || policy?.office_end_time || '17:00',
    timezone: branch?.timezone || policy?.timezone || 'Asia/Karachi',
  }

  const includeSample = (sample: { source: string; recorded_at: string }) => (
    sample.source !== 'scheduled' || isWithinPolicyHoursAt(empPolicy, sample.recorded_at)
  )
  const daySamples = (daySamplesResult.data ?? []).filter(includeSample)
  const dayVisits = dayVisitsResult.data ?? []
  const monthAttendance = monthAttendanceResult.data ?? []
  const monthVisits = monthVisitsResult.data ?? []
  const monthSamples = (monthSamplesResult.data ?? []).filter(includeSample)
  const places = uniquePlaces([
    ...daySamples.map((sample) => ({ address: sample.address, recorded_at: sample.recorded_at, source: sample.source })),
    ...dayVisits.map((visit) => ({ address: visit.place_name || visit.address, recorded_at: visit.visited_at, source: 'visit' })),
  ])

  return NextResponse.json({
    employee: employeeResult.data,
    filters: { date, month },
    day: {
      attendance: dayAttendanceResult.data,
      visits: dayVisits,
      samples: daySamples,
      places,
      summary: {
        sample_count: daySamples.length,
        addressed_sample_count: daySamples.filter((sample) => Boolean(sample.address)).length,
        visit_count: dayVisits.length,
        place_count: places.length,
      },
    },
    month: {
      summary: {
        attendance_days: monthAttendance.length,
        completed_attendance_days: monthAttendance.filter((record) => Boolean(record.clock_out_at)).length,
        visit_count: monthVisits.length,
        location_sample_count: monthSamples.length,
        addressed_location_count: monthSamples.filter((sample) => Boolean(sample.address)).length,
        place_count: uniquePlaces([
          ...monthSamples.map((sample) => ({ address: sample.address, recorded_at: '', source: 'scheduled' })),
          ...monthVisits.map((visit) => ({ address: visit.place_name || visit.address, recorded_at: '', source: 'visit' })),
        ]).length,
      },
    },
  })
}


function karachiMonthRange(month: string) {
  const start = new Date(`${month}-01T00:00:00+05:00`)
  const end = new Date(start)
  end.setUTCMonth(end.getUTCMonth() + 1)
  const [year, monthNumber] = month.split('-').map(Number)
  const endDate = new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10)
  return { start: start.toISOString(), end: end.toISOString(), startDate: `${month}-01`, endDate }
}

function uniquePlaces(items: Array<{ address: string | null; recorded_at: string; source: string }>) {
  const places = new Map<string, { address: string; first_seen_at: string; source: string }>()
  for (const item of items) {
    const address = item.address?.trim()
    if (!address || places.has(address)) continue
    places.set(address, { address, first_seen_at: item.recorded_at, source: item.source })
  }
  return [...places.values()]
}

function isDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function isMonth(value: string) {
  return /^\d{4}-\d{2}$/.test(value)
}
