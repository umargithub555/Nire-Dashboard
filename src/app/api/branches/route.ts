import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createServiceClient()
  const { data, error } = await supabase.from('branches').select('*').order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, address, office_start_time, office_end_time, grace_period_minutes, timezone, latitude, longitude, radius_meters } = body
  const service = createServiceClient()
  const { data, error } = await service.from('branches').insert({
    name,
    address,
    office_start_time: office_start_time || '09:00',
    office_end_time: office_end_time || '17:00',
    grace_period_minutes: typeof grace_period_minutes === 'number' ? grace_period_minutes : 20,
    timezone: timezone || 'Asia/Karachi',
    latitude: typeof latitude === 'number' ? latitude : (latitude ? parseFloat(String(latitude)) : null),
    longitude: typeof longitude === 'number' ? longitude : (longitude ? parseFloat(String(longitude)) : null),
    radius_meters: typeof radius_meters === 'number' ? radius_meters : (radius_meters ? parseFloat(String(radius_meters)) : 100),
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing branch ID' }, { status: 400 })

  const body = await req.json()
  const { name, address, office_start_time, office_end_time, grace_period_minutes, timezone, latitude, longitude, radius_meters } = body
  const service = createServiceClient()

  const { data, error } = await service
    .from('branches')
    .update({
      name,
      address,
      office_start_time: office_start_time || '09:00',
      office_end_time: office_end_time || '17:00',
      grace_period_minutes: typeof grace_period_minutes === 'number' ? grace_period_minutes : 20,
      timezone: timezone || 'Asia/Karachi',
      latitude: typeof latitude === 'number' ? latitude : (latitude ? parseFloat(String(latitude)) : null),
      longitude: typeof longitude === 'number' ? longitude : (longitude ? parseFloat(String(longitude)) : null),
      radius_meters: typeof radius_meters === 'number' ? radius_meters : (radius_meters ? parseFloat(String(radius_meters)) : 100),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing branch ID' }, { status: 400 })

  const service = createServiceClient()

  const { count, error: countError } = await service
    .from('employees')
    .select('id', { count: 'exact', head: true })
    .eq('branch_id', id)

  if (countError) return NextResponse.json({ error: countError.message }, { status: 500 })
  if (count && count > 0) {
    return NextResponse.json(
      { error: 'Cannot delete branch because it still has active employees assigned to it.' },
      { status: 400 }
    )
  }

  const { error } = await service
    .from('branches')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
