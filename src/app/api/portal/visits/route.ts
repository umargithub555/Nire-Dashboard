import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const emp = await service.from('employees').select('id').eq('auth_user_id', user.id).maybeSingle()
  if (emp.error) return NextResponse.json({ error: emp.error.message }, { status: 500 })
  if (!emp.data) return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 })

  const { data, error } = await service
    .from('visits')
    .select('*')
    .eq('employee_id', emp.data.id)
    .order('visited_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const service = createServiceClient()
  const emp = await service.from('employees').select('id, branch_id').eq('auth_user_id', user.id).maybeSingle()
  if (emp.error) return NextResponse.json({ error: emp.error.message }, { status: 500 })
  if (!emp.data) return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 })

  const { data, error } = await service.from('visits').insert({
    employee_id: emp.data.id,
    branch_id: emp.data.branch_id,
    purpose: body.purpose,
    place_name: body.place_name,
    lat: body.lat,
    lng: body.lng,
    address: body.address,
    notes: body.notes,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}