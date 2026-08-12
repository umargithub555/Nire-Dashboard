import { getMobileEmployee } from '@/lib/mobile-auth'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const ctx = await getMobileEmployee(req)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const body = await req.json()
  const samples: IncomingLocationSample[] = Array.isArray(body.samples) ? body.samples : [body]
  const uploadBatchId = crypto.randomUUID()

  const payload = samples
    .map((sample) => ({
      employee_id: ctx.employee.id,
      attendance_id: sample.attendance_id || null,
      recorded_at: sample.recorded_at || new Date().toISOString(),
      lat: Number(sample.lat),
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

  const { data, error } = await ctx.service.from('location_samples').insert(payload).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ uploaded: data?.length ?? 0, upload_batch_id: uploadBatchId })
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
  installation_id?: string
}
