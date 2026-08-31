import { createClient, createServiceClient } from '@/lib/supabase/server'
import { calculateHaversineDistanceMeters } from '@/lib/geo'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const emp = await service.from('employees').select('id, is_active').eq('auth_user_id', user.id).maybeSingle()
  if (emp.error) return NextResponse.json({ error: emp.error.message }, { status: 500 })
  if (!emp.data) return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 })
  if (!emp.data.is_active) return NextResponse.json({ error: 'Your account is inactive. Please contact admin.' }, { status: 403 })

  const { data, error } = await service
    .from('attendance')
    .select('*')
    .eq('employee_id', emp.data.id)
    .order('date', { ascending: false })
    .limit(60)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const service = createServiceClient()
  const emp = await service
    .from('employees')
    .select('id, branch_id, is_active, employee_type, branch:branches(latitude, longitude, radius_meters)')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (emp.error) return NextResponse.json({ error: emp.error.message }, { status: 500 })
  if (!emp.data) return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 })
  if (!emp.data.is_active) return NextResponse.json({ error: 'Your account is inactive. Please contact admin.' }, { status: 403 })
  if (typeof body.lat !== 'number' || typeof body.lng !== 'number') {
    return NextResponse.json({ error: 'Valid location is required for check-in.' }, { status: 400 })
  }

  // Geofence Radius Validation for On-site Staff
  const empType = (emp.data.employee_type || 'onsite').toLowerCase()
  if (empType !== 'marketing') {
    const branch = emp.data.branch as any
    const branchLat = typeof branch?.latitude === 'number' ? branch.latitude : (branch?.latitude ? parseFloat(String(branch.latitude)) : null)
    const branchLng = typeof branch?.longitude === 'number' ? branch.longitude : (branch?.longitude ? parseFloat(String(branch.longitude)) : null)
    const allowedRadius = typeof branch?.radius_meters === 'number' ? branch.radius_meters : (branch?.radius_meters ? parseFloat(String(branch.radius_meters)) : 100)

    if (typeof branchLat === 'number' && typeof branchLng === 'number' && !isNaN(branchLat) && !isNaN(branchLng)) {
      const distanceMeters = calculateHaversineDistanceMeters(body.lat, body.lng, branchLat, branchLng)
      if (distanceMeters > allowedRadius) {
        const distKm = (distanceMeters / 1000).toFixed(1)
        const displayDist = distanceMeters >= 1000 ? `${distKm} km` : `${Math.round(distanceMeters)} m`
        return NextResponse.json(
          {
            error: `Check-in rejected: You are ${displayDist} away from your assigned office (Allowed radius: ${allowedRadius}m). On-site staff must check in from within the allowed radius.`,
          },
          { status: 400 }
        )
      }
    }
  }

  const today = new Date().toISOString().split('T')[0]
  const existing = await service
    .from('attendance')
    .select('id')
    .eq('employee_id', emp.data.id)
    .eq('date', today)
    .maybeSingle()

  if (existing.data) return NextResponse.json({ error: 'Already checked in today' }, { status: 400 })

  const insertPayload = {
    employee_id: emp.data.id,
    branch_id: emp.data.branch_id,
    clock_in_at: new Date().toISOString(),
    clock_in_lat: body.lat,
    clock_in_lng: body.lng,
    clock_in_address: body.address,
    clock_in_accuracy_meters: typeof body.accuracy === 'number' ? body.accuracy : null,
    date: today,
  }

  let { data, error } = await service.from('attendance').insert(insertPayload).select().single()

  if (shouldRetryWithoutAccuracy(error)) {
    const { clock_in_accuracy_meters, ...fallbackPayload } = insertPayload
    const retry = await service.from('attendance').insert(fallbackPayload).select().single()
    data = retry.data
    error = retry.error
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const service = createServiceClient()
  const emp = await service
    .from('employees')
    .select('id, is_active, employee_type, branch:branches(latitude, longitude, radius_meters)')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (emp.error) return NextResponse.json({ error: emp.error.message }, { status: 500 })
  if (!emp.data) return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 })
  if (!emp.data.is_active) return NextResponse.json({ error: 'Your account is inactive. Please contact admin.' }, { status: 403 })
  if (typeof body.lat !== 'number' || typeof body.lng !== 'number') {
    return NextResponse.json({ error: 'Valid location is required for check-out.' }, { status: 400 })
  }

  // Geofence Radius Validation for On-site Staff
  const empType = (emp.data.employee_type || 'onsite').toLowerCase()
  if (empType !== 'marketing') {
    const branch = emp.data.branch as any
    const branchLat = typeof branch?.latitude === 'number' ? branch.latitude : (branch?.latitude ? parseFloat(String(branch.latitude)) : null)
    const branchLng = typeof branch?.longitude === 'number' ? branch.longitude : (branch?.longitude ? parseFloat(String(branch.longitude)) : null)
    const allowedRadius = typeof branch?.radius_meters === 'number' ? branch.radius_meters : (branch?.radius_meters ? parseFloat(String(branch.radius_meters)) : 100)

    if (typeof branchLat === 'number' && typeof branchLng === 'number' && !isNaN(branchLat) && !isNaN(branchLng)) {
      const distanceMeters = calculateHaversineDistanceMeters(body.lat, body.lng, branchLat, branchLng)
      if (distanceMeters > allowedRadius) {
        const distKm = (distanceMeters / 1000).toFixed(1)
        const displayDist = distanceMeters >= 1000 ? `${distKm} km` : `${Math.round(distanceMeters)} m`
        return NextResponse.json(
          {
            error: `Check-out rejected: You are ${displayDist} away from your assigned office (Allowed radius: ${allowedRadius}m). On-site staff must check out from within the allowed radius.`,
          },
          { status: 400 }
        )
      }
    }
  }

  const today = new Date().toISOString().split('T')[0]
  const attendance = await service
    .from('attendance')
    .select('id, clock_out_at')
    .eq('employee_id', emp.data.id)
    .eq('date', today)
    .maybeSingle()

  if (attendance.error) return NextResponse.json({ error: attendance.error.message }, { status: 500 })
  if (!attendance.data) return NextResponse.json({ error: 'Please check in before checking out.' }, { status: 400 })
  if (attendance.data.clock_out_at) return NextResponse.json({ error: 'You have already checked out today.' }, { status: 400 })

  const updatePayload = {
    clock_out_at: new Date().toISOString(),
    clock_out_lat: body.lat,
    clock_out_lng: body.lng,
    clock_out_address: body.address,
    clock_out_accuracy_meters: typeof body.accuracy === 'number' ? body.accuracy : null,
  }

  let { data, error } = await service
    .from('attendance')
    .update(updatePayload)
    .eq('id', attendance.data.id)
    .select()
    .single()

  if (shouldRetryWithoutAccuracy(error)) {
    const { clock_out_accuracy_meters, ...fallbackPayload } = updatePayload
    const retry = await service
      .from('attendance')
      .update(fallbackPayload)
      .eq('id', attendance.data.id)
      .select()
      .single()
    data = retry.data
    error = retry.error
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

function shouldRetryWithoutAccuracy(error: any) {
  if (!error) return false
  const msg = String(error.message || '').toLowerCase()
  return msg.includes('clock_in_accuracy_meters') || msg.includes('clock_out_accuracy_meters') || msg.includes('column')
}
