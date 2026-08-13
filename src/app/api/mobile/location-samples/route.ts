import { getMobileEmployee } from '@/lib/mobile-auth'
import { isWithinPolicyHoursAt } from '@/lib/tracking'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const ctx = await getMobileEmployee(req)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const { searchParams } = new URL(req.url)
  const latest = searchParams.get('latest') === '1'

  let query = ctx.service
    .from('location_samples')
    .select('*')
    .eq('employee_id', ctx.employee.id)
    .order('recorded_at', { ascending: false })

  if (latest) query = query.limit(1)
  else query = query.limit(100)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (latest) return NextResponse.json({ latest_sample: data?.[0] ?? null })
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const ctx = await getMobileEmployee(req)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const body = await req.json()
  const samples: IncomingLocationSample[] = Array.isArray(body.samples) ? body.samples : [body]
  const uploadBatchId = crypto.randomUUID()

  const { data: policy, error: policyError } = await ctx.service
    .from('tracking_policies')
    .select('office_start_time, office_end_time, timezone')
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (policyError) return NextResponse.json({ error: policyError.message }, { status: 500 })

  const payload = samples
    .map((sample) => ({
      employee_id: ctx.employee.id,
      attendance_id: sample.attendance_id || null,
      recorded_at: sample.recorded_at || new Date().toISOString(),
      lat: Number(sample.lat),
      address: typeof sample.address === 'string' ? sample.address : null,
      lng: Number(sample.lng),
      accuracy_meters: numberOrNull(sample.accuracy_meters ?? sample.accuracy),
      altitude: numberOrNull(sample.altitude),
      heading: numberOrNull(sample.heading),
      speed: numberOrNull(sample.speed),
      mocked: typeof sample.mocked === 'boolean' ? sample.mocked : null,
      source: sample.source || 'scheduled',
      battery_level: numberOrNull(sample.battery_level),
      is_charging: typeof sample.is_charging === 'boolean' ? sample.is_charging : null,
      network_type: sample.network_type || null,
      app_state: sample.app_state || null,
      installation_id: sample.installation_id || null,
      upload_batch_id: uploadBatchId,
    }))
    .filter((sample) => Number.isFinite(sample.lat) && Number.isFinite(sample.lng))

  if (payload.length === 0) {
    return NextResponse.json({ error: 'At least one valid location sample is required.' }, { status: 400 })
  }

  const activePolicy = policy ?? {
    office_start_time: '09:00',
    office_end_time: '17:00',
    timezone: 'Asia/Karachi',
  }
  const acceptedPayload = payload.filter((sample) => (
    sample.source !== 'scheduled' || isWithinPolicyHoursAt(activePolicy, sample.recorded_at)
  ))
  const discardedOutsideOfficeHours = payload.length - acceptedPayload.length

  if (acceptedPayload.length === 0) {
    return NextResponse.json({
      uploaded: 0,
      discarded_outside_office_hours: discardedOutsideOfficeHours,
      upload_batch_id: uploadBatchId,
    })
  }

  const { data, error } = await ctx.service.from('location_samples').insert(acceptedPayload).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ uploaded: data?.length ?? 0, discarded_outside_office_hours: discardedOutsideOfficeHours, upload_batch_id: uploadBatchId })
}

function numberOrNull(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

type IncomingLocationSample = {
  attendance_id?: string
  recorded_at?: string
  lat?: number
  lng?: number
  accuracy?: number
  accuracy_meters?: number
  altitude?: number
  heading?: number
  speed?: number
  mocked?: boolean
  source?: string
  battery_level?: number
  is_charging?: boolean
  network_type?: string
  app_state?: string
  address?: string
  installation_id?: string
}
