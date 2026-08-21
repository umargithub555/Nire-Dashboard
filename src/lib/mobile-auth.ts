import { createServiceClient } from '@/lib/supabase/server'

export async function getMobileEmployee(req: Request) {
  const auth = req.headers.get('authorization') ?? ''
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : ''

  if (!token) {
    return { error: 'Missing bearer token', status: 401 as const }
  }

  const service = createServiceClient()
  const {
    data: { user },
    error: userError,
  } = await service.auth.getUser(token)

  if (userError || !user) {
    return { error: 'Unauthorized', status: 401 as const }
  }

  const { data: employee, error: employeeError } = await service
    .from('employees')
    .select('*, branch:branches(id, name, address, office_start_time, office_end_time, grace_period_minutes, timezone)')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (employeeError) {
    return { error: employeeError.message, status: 500 as const }
  }

  if (!employee) {
    return { error: 'Employee profile not found', status: 404 as const }
  }

  if (!employee.is_active) {
    return { error: 'Your account is inactive. Please contact admin.', status: 403 as const }
  }

  return { user, employee, service }
}

export type MobileEmployeeContext = Awaited<ReturnType<typeof getMobileEmployee>>
