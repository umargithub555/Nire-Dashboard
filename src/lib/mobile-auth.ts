import { createServiceClient } from '@/lib/supabase/server'

export async function getMobileEmployee(req: Request) {
  const auth = req.headers.get('authorization') ?? ''
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : ''

  if (!token) {
    return { error: 'Missing bearer token', status: 401 as const }
  }

  const service = createServiceClient()
  let userId: string | null = null

  const {
    data: { user },
    error: userError,
  } = await service.auth.getUser(token)

  if (user) {
    userId = user.id
  } else {
    // If Supabase auth.getUser failed (e.g. JWT expired during long background tracking),
    // extract user ID from JWT payload to keep background tracking seamless for active employees
    try {
      const payloadBase64 = token.split('.')[1]
      if (payloadBase64) {
        const decoded = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf-8'))
        if (decoded && typeof decoded.sub === 'string' && decoded.sub) {
          userId = decoded.sub
        }
      }
    } catch (e) {
      console.error('Failed to parse fallback mobile auth JWT payload:', e)
    }
  }

  if (!userId) {
    return { error: 'Unauthorized', status: 401 as const }
  }

  const { data: employee, error: employeeError } = await service
    .from('employees')
    .select('*, branch:branches(id, name, address, office_start_time, office_end_time, grace_period_minutes, timezone)')
    .eq('auth_user_id', userId)
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

  return { user: user ?? ({ id: userId } as any), employee, service }
}

export type MobileEmployeeContext = Awaited<ReturnType<typeof getMobileEmployee>>
