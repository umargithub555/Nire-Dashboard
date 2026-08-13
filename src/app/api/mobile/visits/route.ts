import { getMobileEmployee } from '@/lib/mobile-auth'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const ctx = await getMobileEmployee(req)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const { data, error } = await ctx.service
    .from('visits')
    .select('*')
    .eq('employee_id', ctx.employee.id)
    .order('visited_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const ctx = await getMobileEmployee(req)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const body = await req.json()
  if (typeof body.lat !== 'number' || typeof body.lng !== 'number') {
    return NextResponse.json({ error: 'Valid location is required for a visit.' }, { status: 400 })
  }

  const { data, error } = await ctx.service
    .from('visits')
    .insert({
      employee_id: ctx.employee.id,
      branch_id: ctx.employee.branch_id,
      purpose: body.purpose,
      place_name: body.place_name,
      lat: body.lat,
      lng: body.lng,
      address: body.address,
      notes: body.notes,
      visited_at: body.visited_at || new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await ctx.service.from('location_samples').insert({
    employee_id: ctx.employee.id,
    recorded_at: body.recorded_at || body.visited_at || new Date().toISOString(),
    lat: body.lat,
    lng: body.lng,
    address: body.address || null,
    accuracy_meters: typeof body.accuracy === 'number' ? body.accuracy : null,
    mocked: typeof body.mocked === 'boolean' ? body.mocked : null,
    source: 'visit',
    installation_id: body.installation_id || null,
  })

  return NextResponse.json(data)
}
