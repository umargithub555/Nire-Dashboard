import { getMobileEmployee } from '@/lib/mobile-auth'
import { todayDateString } from '@/lib/tracking'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const ctx = await getMobileEmployee(req)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const { data, error } = await ctx.service
    .from('attendance')
    .select('*')
    .eq('employee_id', ctx.employee.id)
    .order('date', { ascending: false })
    .limit(60)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const ctx = await getMobileEmployee(req)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const body = (await req.json()) as AttendanceLocationBody
  if (typeof body.lat !== 'number' || typeof body.lng !== 'number') {
    return NextResponse.json({ error: 'Valid location is required for check-in.' }, { status: 400 })
  }

  const today = todayDateString()
  const existing = await ctx.service
    .from('attendance')
    .select('id')
    .eq('employee_id', ctx.employee.id)
    .eq('date', today)
    .maybeSingle()

  if (existing.error) return NextResponse.json({ error: existing.error.message }, { status: 500 })
  if (existing.data) return NextResponse.json({ error: 'Already checked in today' }, { status: 400 })

  const { data, error } = await ctx.service
    .from('attendance')
    .insert({
      employee_id: ctx.employee.id,
      branch_id: ctx.employee.branch_id,
      clock_in_at: new Date().toISOString(),
      clock_in_lat: body.lat,
      clock_in_lng: body.lng,
      clock_in_address: body.address,
      clock_in_accuracy_meters: typeof body.accuracy === 'number' ? body.accuracy : null,
      date: today,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await insertAttendanceLocationSample(ctx, data.id, body, 'attendance_checkin')
  return NextResponse.json(data)
}

export async function PATCH(req: Request) {
  const ctx = await getMobileEmployee(req)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const body = (await req.json()) as AttendanceLocationBody
  if (typeof body.lat !== 'number' || typeof body.lng !== 'number') {
    return NextResponse.json({ error: 'Valid location is required for check-out.' }, { status: 400 })
  }

  const today = todayDateString()
  const attendance = await ctx.service
    .from('attendance')
    .select('id, clock_out_at')
    .eq('employee_id', ctx.employee.id)
    .eq('date', today)
    .maybeSingle()

  if (attendance.error) return NextResponse.json({ error: attendance.error.message }, { status: 500 })
  if (!attendance.data) return NextResponse.json({ error: 'Please check in before checking out.' }, { status: 400 })
  if (attendance.data.clock_out_at) return NextResponse.json({ error: 'You have already checked out today.' }, { status: 400 })

  const { data, error } = await ctx.service
    .from('attendance')
    .update({
      clock_out_at: new Date().toISOString(),
      clock_out_lat: body.lat,
      clock_out_lng: body.lng,
      clock_out_address: body.address,
      clock_out_accuracy_meters: typeof body.accuracy === 'number' ? body.accuracy : null,
    })
    .eq('id', attendance.data.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await insertAttendanceLocationSample(ctx, attendance.data.id, body, 'attendance_checkout')
  return NextResponse.json(data)
}

async function insertAttendanceLocationSample(
  ctx: MobileEmployeeOk,
  attendanceId: string,
  body: AttendanceLocationBody,
  source: 'attendance_checkin' | 'attendance_checkout'
) {
  await ctx.service.from('location_samples').insert({
    employee_id: ctx.employee.id,
    attendance_id: attendanceId,
    recorded_at: body.recorded_at || new Date().toISOString(),
    lat: body.lat,
    lng: body.lng,
    accuracy_meters: typeof body.accuracy === 'number' ? body.accuracy : null,
    mocked: typeof body.mocked === 'boolean' ? body.mocked : null,
    source,
    installation_id: body.installation_id || null,
  })
}

type AttendanceLocationBody = {
  lat: number
  lng: number
  address?: string
  accuracy?: number
  mocked?: boolean
  recorded_at?: string
  installation_id?: string
}

type MobileEmployeeOk = Exclude<Awaited<ReturnType<typeof getMobileEmployee>>, { error: string }>
