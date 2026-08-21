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

  let effectivePolicy = policy
  if (ctx.employee?.branch_id) {
    const { data: branch } = await ctx.service
      .from('branches')
      .select('office_start_time, office_end_time, grace_period_minutes, timezone')
      .eq('id', ctx.employee.branch_id)
      .maybeSingle()

    if (branch && branch.office_start_time && branch.office_end_time) {
      effectivePolicy = {
        ...(policy || {}),
        office_start_time: branch.office_start_time,
        office_end_time: branch.office_end_time,
        grace_period_minutes: branch.grace_period_minutes ?? 20,
        timezone: branch.timezone || 'Asia/Karachi',
        sample_interval_minutes: policy?.sample_interval_minutes ?? 5,
        is_active: true,
      }
    }
  }

  return NextResponse.json({ employee: ctx.employee, policy: effectivePolicy })
}
