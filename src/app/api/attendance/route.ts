import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const branch_id = searchParams.get('branch_id')
  const service = createServiceClient()

  let query = service
    .from('attendance')
    .select('*, employee:employees(full_name, designation, branch:branches(name))')
    .order('clock_in_at', { ascending: false })

  if (date) query = query.eq('date', date)
  if (branch_id) query = query.eq('branch_id', branch_id)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}