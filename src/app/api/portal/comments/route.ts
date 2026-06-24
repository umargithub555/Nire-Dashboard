import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const expense_id = searchParams.get('expense_id')
  if (!expense_id) return NextResponse.json({ error: 'expense_id required' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const emp = await service.from('employees').select('id').eq('auth_user_id', user.id).single()

  // Check expense does not belong to this employee
  const expense = await service.from('expenses').select('employee_id').eq('id', expense_id).single()
  if (expense.data?.employee_id === emp.data?.id) {
    return NextResponse.json({ error: 'Cannot view comments on your own expense' }, { status: 403 })
  }

  const { data, error } = await service
    .from('expense_comments')
    .select('*, author:employees(full_name)')
    .eq('expense_id', expense_id)
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const service = createServiceClient()
  const emp = await service.from('employees').select('id').eq('auth_user_id', user.id).single()
  if (emp.error) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

  // Prevent commenting on own expense
  const expense = await service.from('expenses').select('employee_id').eq('id', body.expense_id).single()
  if (expense.data?.employee_id === emp.data.id) {
    return NextResponse.json({ error: 'Cannot comment on your own expense' }, { status: 403 })
  }

  const { data, error } = await service.from('expense_comments').insert({
    expense_id: body.expense_id,
    author_id: emp.data.id,
    comment: body.comment,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}