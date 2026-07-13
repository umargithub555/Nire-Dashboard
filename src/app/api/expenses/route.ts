import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const branch_id = searchParams.get('branch_id')
  const service = createServiceClient()

  let query = service
    .from('expenses')
    .select(`
      *,
      employee:employees(full_name),
      comment_count:expense_comments(count)
    `)
    .order('created_at', { ascending: false })

  if (branch_id) query = query.eq('branch_id', branch_id)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}