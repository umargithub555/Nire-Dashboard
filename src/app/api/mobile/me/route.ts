import { getMobileEmployee } from '@/lib/mobile-auth'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const ctx = await getMobileEmployee(req)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const { data: policy, error } = await ctx.service
    .from('tracking_policies')
    .select('*')
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ employee: ctx.employee, policy })
}
