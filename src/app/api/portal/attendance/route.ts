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
    .from('attendance')
    .select('*')
    .eq('employee_id', emp.data.id)
    .order('date', { ascending: false })
    .limit(60)

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

  // Check already checked in today
  const today = new Date().toISOString().split('T')[0]
  const existing = await service
    .from('attendance')
    .select('id')
    .eq('employee_id', emp.data.id)
    .eq('date', today)
    .single()

  if (existing.data) return NextResponse.json({ error: 'Already checked in today' }, { status: 400 })

  const { data, error } = await service.from('attendance').insert({
    employee_id: emp.data.id,
    branch_id: emp.data.branch_id,
    clock_in_lat: body.lat,
    clock_in_lng: body.lng,
    clock_in_address: body.address,
    date: today,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}