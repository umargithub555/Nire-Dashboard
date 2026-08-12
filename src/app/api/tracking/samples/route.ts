import { createServiceClient } from '@/lib/supabase/server'
import { todayDateString } from '@/lib/tracking'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const employeeId = searchParams.get('employee_id')
  const date = searchParams.get('date') ?? todayDateString()

  if (!employeeId) {
    return NextResponse.json({ error: 'employee_id is required' }, { status: 400 })
  }

  const service = createServiceClient()
  const start = `${date}T00:00:00.000Z`
  const endDate = new Date(`${date}T00:00:00.000Z`)
  endDate.setUTCDate(endDate.getUTCDate() + 1)

  const { data, error } = await service
    .from('location_samples')
    .select('*')
    .eq('employee_id', employeeId)
    .gte('recorded_at', start)
    .lt('recorded_at', endDate.toISOString())
    .order('recorded_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
