import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const month = searchParams.get('month')
  const branch_id = searchParams.get('branch_id')
  const service = createServiceClient()

  let query = service
    .from('attendance')
    .select('*, employee:employees(id, full_name, designation, salary, branch:branches(id, name, office_start_time, office_end_time, grace_period_minutes, timezone))')
    .order('clock_in_at', { ascending: false })

  if (date) query = query.eq('date', date)
  if (month) {
    const [yearStr, monthStr] = month.split('-')
    const year = parseInt(yearStr, 10)
    const m = parseInt(monthStr, 10)
    if (!isNaN(year) && !isNaN(m)) {
      const lastDay = new Date(year, m, 0).getDate()
      const startOfMonth = `${month}-01`
      const endOfMonth = `${month}-${String(lastDay).padStart(2, '0')}`
      query = query.gte('date', startOfMonth).lte('date', endOfMonth)
    }
  }
  if (branch_id) query = query.eq('branch_id', branch_id)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}