import { getMobileEmployee } from '@/lib/mobile-auth'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const ctx = await getMobileEmployee(req)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const body = await req.json()
  if (!body.installation_id) {
    return NextResponse.json({ error: 'installation_id is required' }, { status: 400 })
  }

  const payload = {
    employee_id: ctx.employee.id,
    installation_id: String(body.installation_id),
    platform: String(body.platform ?? 'android'),
    app_version: body.app_version ? String(body.app_version) : null,
    device_name: body.device_name ? String(body.device_name) : null,
    os_version: body.os_version ? String(body.os_version) : null,
    permission_foreground: Boolean(body.permission_foreground),
    permission_background: Boolean(body.permission_background),
    location_services_enabled: Boolean(body.location_services_enabled),
    battery_optimization_note: body.battery_optimization_note ? String(body.battery_optimization_note) : null,
    last_error: body.last_error ? String(body.last_error) : null,
    last_seen_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await ctx.service
    .from('employee_devices')
    .upsert(payload, { onConflict: 'employee_id,installation_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
