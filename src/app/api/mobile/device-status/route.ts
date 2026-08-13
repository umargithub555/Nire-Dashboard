import { getMobileEmployee } from '@/lib/mobile-auth'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const ctx = await getMobileEmployee(req)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const body = await req.json()
  if (!body.installation_id) {
    return NextResponse.json({ error: 'installation_id is required' }, { status: 400 })
  }

  const installationId = String(body.installation_id)
  const { data: existing, error: existingError } = await ctx.service
    .from('employee_devices')
    .select('permission_foreground, permission_background, location_services_enabled')
    .eq('employee_id', ctx.employee.id)
    .eq('installation_id', installationId)
    .maybeSingle()

  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 })

  const payload = {
    employee_id: ctx.employee.id,
    installation_id: installationId,
    platform: String(body.platform ?? 'android'),
    app_version: body.app_version ? String(body.app_version) : null,
    device_name: body.device_name ? String(body.device_name) : null,
    os_version: body.os_version ? String(body.os_version) : null,
    permission_foreground: typeof body.permission_foreground === 'boolean' ? body.permission_foreground : existing?.permission_foreground ?? false,
    permission_background: typeof body.permission_background === 'boolean' ? body.permission_background : existing?.permission_background ?? false,
    location_services_enabled: typeof body.location_services_enabled === 'boolean' ? body.location_services_enabled : existing?.location_services_enabled ?? false,
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
