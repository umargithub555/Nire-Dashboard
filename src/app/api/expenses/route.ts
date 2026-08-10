import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const branch_id = searchParams.get('branch_id')
  const period = searchParams.get('period') ?? 'day'
  const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0]
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
  if (date) {
    const [startDate, endDate] = getExpenseRange(period, date)
    query = query.gte('expense_date', startDate).lte('expense_date', endDate)
  }
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

function getExpenseRange(period: string, date: string) {
  const baseDate = new Date(`${date}T00:00:00`)

  if (Number.isNaN(baseDate.getTime())) {
    return [date, date]
  }

  if (period === 'month') {
    const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1)
    const end = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0)
    return [toDateString(start), toDateString(end)]
  }

  if (period === 'week') {
    const day = baseDate.getDay()
    const diffToMonday = day === 0 ? -6 : 1 - day
    const start = new Date(baseDate)
    start.setDate(baseDate.getDate() + diffToMonday)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return [toDateString(start), toDateString(end)]
  }

  return [date, date]
}

function toDateString(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
