import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const service = createServiceClient()
  const { data, error } = await service
    .from('tracking_policies')
    .select('*')
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const validationError = validatePolicy(body)
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

  const service = createServiceClient()
  const { data: current } = await service
    .from('tracking_policies')
    .select('id')
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const payload = {
    name: body.name?.trim() || 'Default policy',
    office_start_time: body.office_start_time,
    office_end_time: body.office_end_time,
    timezone: body.timezone?.trim() || 'Asia/Karachi',
    sample_interval_minutes: Number(body.sample_interval_minutes),
    grace_period_minutes: Number(body.grace_period_minutes ?? 10),
    updated_by: user.id,
    updated_at: new Date().toISOString(),
    is_active: true,
  }

  const query = current?.id
    ? service.from('tracking_policies').update(payload).eq('id', current.id)
    : service.from('tracking_policies').insert(payload)

  const { data, error } = await query.select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

function validatePolicy(body: Record<string, unknown>) {
  const start = String(body.office_start_time ?? '')
  const end = String(body.office_end_time ?? '')
  const interval = Number(body.sample_interval_minutes)
  const grace = Number(body.grace_period_minutes ?? 10)

  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(start)) return 'Valid office start time is required.'
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(end)) return 'Valid office end time is required.'
  if (!Number.isInteger(interval) || interval < 5 || interval > 240) {
    return 'Tracking interval must be between 5 and 240 minutes.'
  }
  if (!Number.isInteger(grace) || grace < 0 || grace > 120) {
    return 'Grace period must be between 0 and 120 minutes.'
  }
  return null
}
