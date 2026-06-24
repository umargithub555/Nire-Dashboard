import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const expense_id = searchParams.get('expense_id')
  if (!expense_id) return NextResponse.json({ error: 'expense_id required' }, { status: 400 })

  const service = createServiceClient()
  const { data, error } = await service
    .from('expense_comments')
    .select('*, author:employees(full_name)')
    .eq('expense_id', expense_id)
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}