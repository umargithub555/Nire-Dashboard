import { createServiceClient } from '@/lib/supabase/server'
import { getStalenessStatus, todayDateString } from '@/lib/tracking'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const branchId = searchParams.get('branch_id')
  const service = createServiceClient()
  const today = todayDateString()

  const { data: policy, error: policyError } = await service
    .from('tracking_policies')
    .select('*')
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (policyError) return NextResponse.json({ error: policyError.message }, { status: 500 })

  let employeeQuery = service
    .from('employees')
    .select('*, branch:branches(name, address)')
    .eq('is_active', true)
    .order('full_name')

  if (branchId) employeeQuery = employeeQuery.eq('branch_id', branchId)

  const [employeesResult, samplesResult, attendanceResult, devicesResult] = await Promise.all([
    employeeQuery,
    service
      .from('location_samples')
      .select('*')
      .gte('recorded_at', `${today}T00:00:00.000Z`)
      .order('recorded_at', { ascending: false })
      .limit(2000),
    service
      .from('attendance')
      .select('*')
      .eq('date', today),
    service
      .from('employee_devices')
      .select('*')
      .order('last_seen_at', { ascending: false }),
  ])

  if (employeesResult.error) return NextResponse.json({ error: employeesResult.error.message }, { status: 500 })
  if (samplesResult.error) return NextResponse.json({ error: samplesResult.error.message }, { status: 500 })
  if (attendanceResult.error) return NextResponse.json({ error: attendanceResult.error.message }, { status: 500 })
  if (devicesResult.error) return NextResponse.json({ error: devicesResult.error.message }, { status: 500 })

  const latestSamples = new Map<string, LocationSampleRow>()
  for (const sample of samplesResult.data ?? []) {
    if (!latestSamples.has(sample.employee_id)) latestSamples.set(sample.employee_id, sample)
  }

  const todayAttendance = new Map((attendanceResult.data ?? []).map((record: AttendanceRow) => [record.employee_id, record]))
  const latestDevices = new Map<string, EmployeeDeviceRow>()
  for (const device of devicesResult.data ?? []) {
    if (!latestDevices.has(device.employee_id)) latestDevices.set(device.employee_id, device)
  }

  const interval = policy?.sample_interval_minutes ?? 30
  const employees = (employeesResult.data ?? []).map((employee: EmployeeRow) => {
    const sample = latestSamples.get(employee.id) ?? null
    const device = latestDevices.get(employee.id) ?? null
    const attendance = todayAttendance.get(employee.id) ?? null
    const lastSeenAt = sample?.recorded_at ?? device?.last_seen_at ?? null

    return {
      employee,
      attendance,
      latest_sample: sample,
      device,
      status: getStalenessStatus(lastSeenAt, interval),
      last_seen_at: lastSeenAt,
    }
  })

  return NextResponse.json({ policy, employees })
}

type EmployeeRow = {
  id: string
  full_name: string
  designation: string | null
  branch?: { name: string | null; address?: string | null } | null
}

type AttendanceRow = {
  employee_id: string
  clock_in_at: string
  clock_out_at: string | null
}

type LocationSampleRow = {
  employee_id: string
  recorded_at: string
  address: string | null
  lat: number
  lng: number
  accuracy_meters: number | null
  mocked: boolean | null
  source: string
}

type EmployeeDeviceRow = {
  employee_id: string
  last_seen_at: string | null
  permission_foreground: boolean
  permission_background: boolean
  location_services_enabled: boolean
  last_error: string | null
}
