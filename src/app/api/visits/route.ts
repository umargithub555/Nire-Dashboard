import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const branch_id = searchParams.get('branch_id')
  const employee_id = searchParams.get('employee_id')
  const date = searchParams.get('date')
  const month = searchParams.get('month')
  const service = createServiceClient()

  let query = service
    .from('visits')
    .select('*, employee:employees(id, full_name, designation, phone, avatar_url, branch_id, branch:branches(id, name))')
    .order('visited_at', { ascending: false })

  if (branch_id) query = query.eq('branch_id', branch_id)
  if (employee_id) query = query.eq('employee_id', employee_id)

  if (date) {
    // Specific single day (e.g. 2026-09-01)
    const startOfDay = `${date}T00:00:00.000Z`
    const endOfDay = `${date}T23:59:59.999Z`
    query = query.gte('visited_at', startOfDay).lte('visited_at', endOfDay)
  } else if (month) {
    // Specific month (e.g. 2026-09)
    const [yearStr, monthStr] = month.split('-')
    const year = parseInt(yearStr, 10)
    const m = parseInt(monthStr, 10)
    if (!isNaN(year) && !isNaN(m)) {
      const lastDay = new Date(year, m, 0).getDate()
      const startOfMonth = `${month}-01T00:00:00.000Z`
      const endOfMonth = `${month}-${String(lastDay).padStart(2, '0')}T23:59:59.999Z`
      query = query.gte('visited_at', startOfMonth).lte('visited_at', endOfMonth)
    }
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}