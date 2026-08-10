// import { createClient, createServiceClient } from '@/lib/supabase/server'
// import { NextResponse } from 'next/server'

// export async function GET() {
//   const supabase = await createClient()
//   const { data: { user } } = await supabase.auth.getUser()
//   if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

//   const service = createServiceClient()
//   const emp = await service.from('employees').select('id, branch_id').eq('auth_user_id', user.id).maybeSingle()
//   if (emp.error) return NextResponse.json({ error: emp.error.message }, { status: 500 })
//   if (!emp.data) return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 })

//   // Get all branch expenses (to comment on others) + own expenses separately
//   const { data, error } = await service
//     .from('expenses')
//     .select('*, employee:employees(full_name)')
//     .eq('branch_id', emp.data.branch_id)
//     .order('created_at', { ascending: false })

//   if (error) return NextResponse.json({ error: error.message }, { status: 500 })

//   // Tag which ones are own
//   const result = data.map(e => ({
//     ...e,
//     is_own: e.employee_id === emp.data.id
//   }))

//   return NextResponse.json({ expenses: result, my_employee_id: emp.data.id })
// }

// export async function POST(req: Request) {
//   const supabase = await createClient()
//   const { data: { user } } = await supabase.auth.getUser()
//   if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

//   const body = await req.json()
//   const service = createServiceClient()
//   const emp = await service.from('employees').select('id, branch_id').eq('auth_user_id', user.id).maybeSingle()
//   if (emp.error) return NextResponse.json({ error: emp.error.message }, { status: 500 })
//   if (!emp.data) return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 })

//   const { data, error } = await service.from('expenses').insert({
//     employee_id: emp.data.id,
//     branch_id: emp.data.branch_id,
//     title: body.title,
//     amount: body.amount,
//     category: body.category ?? 'food',
//     description: body.description,
//     expense_date: body.expense_date ?? new Date().toISOString().split('T')[0],
//   }).select().single()

//   if (error) return NextResponse.json({ error: error.message }, { status: 500 })
//   return NextResponse.json(data)
// }


import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const emp = await service.from('employees').select('id, branch_id, is_active').eq('auth_user_id', user.id).maybeSingle()
  
  if (emp.error) return NextResponse.json({ error: emp.error.message }, { status: 500 })
  if (!emp.data) return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 })
  if (!emp.data.is_active) return NextResponse.json({ error: 'Your account is inactive. Please contact admin.' }, { status: 403 })

  // Destructure and localise variables here. 
  // TypeScript now guarantees these are not null/undefined for the rest of the execution.
  const { id: empId, branch_id: branchId } = emp.data

  // Get all branch expenses
  const { data, error } = await service
    .from('expenses')
    .select('*, employee:employees(full_name)')
    .eq('branch_id', branchId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Tag which ones are own safely using local variables
  const result = data?.map(e => ({
    ...e,
    is_own: e.employee_id === empId
  })) ?? []

  return NextResponse.json({ expenses: result, my_employee_id: empId })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const service = createServiceClient()
  const emp = await service.from('employees').select('id, branch_id, is_active').eq('auth_user_id', user.id).maybeSingle()
  
  if (emp.error) return NextResponse.json({ error: emp.error.message }, { status: 500 })
  if (!emp.data) return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 })
  if (!emp.data.is_active) return NextResponse.json({ error: 'Your account is inactive. Please contact admin.' }, { status: 403 })

  const { id: empId, branch_id: branchId } = emp.data
  const items = Array.isArray(body.items) ? body.items : []
  const normalizedItems: Array<{ title: string; amount: number }> = items
    .map((item: { title?: string; amount?: number }) => ({
      title: item.title?.trim() ?? '',
      amount: Number(item.amount),
    }))
  const validItems = normalizedItems.filter((item) => item.title && Number.isFinite(item.amount) && item.amount > 0)

  if (validItems.length === 0) {
    return NextResponse.json({ error: 'Add at least one expense item with a valid amount.' }, { status: 400 })
  }

  const payload = validItems.map((item) => ({
    employee_id: empId,
    branch_id: branchId,
    title: item.title,
    amount: item.amount,
    category: body.category ?? 'food',
    description: body.description?.trim() || null,
    expense_date: body.expense_date ?? new Date().toISOString().split('T')[0],
  }))

  const { data, error } = await service.from('expenses').insert(payload).select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
