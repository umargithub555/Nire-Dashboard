import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, buildCredentialsEmailHtml } from '@/lib/email'

async function sendCredentialsEmail(email: string, password: string, fullName: string, origin: string) {
  const appUrl = origin || 'http://localhost:3000'
  const subject = 'Welcome to Nire — Your Account Credentials'
  const htmlContent = buildCredentialsEmailHtml({
    fullName,
    email,
    password,
    appUrl,
    type: 'welcome',
  })

  await sendEmail({
    to: email,
    subject,
    html: htmlContent,
  })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const branch_id = searchParams.get('branch_id')
  const service = createServiceClient()
  let query = service.from('employees').select('*, branch:branches(name)').order('full_name')
  if (branch_id) query = query.eq('branch_id', branch_id)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { email, password, full_name, branch_id, designation, phone, salary, employee_type } = body
  const origin = req.nextUrl.origin
  const service = createServiceClient()

  // Create auth user
  const { data: authUser, error: authError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

  // Create employee record
  const { data, error } = await service.from('employees').insert({
    auth_user_id: authUser.user.id,
    email,
    full_name,
    branch_id,
    designation,
    phone,
    salary: typeof salary === 'number' || typeof salary === 'string' ? Number(salary) || 0 : 0,
    employee_type: employee_type || 'onsite',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send credentials email
  await sendCredentialsEmail(email, password, full_name, origin)

  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing employee ID' }, { status: 400 })

  const body = await req.json()
  const { email, full_name, branch_id, designation, phone, is_active, salary, employee_type } = body
  const service = createServiceClient()

  // Fetch current record
  const { data: currentEmp, error: getError } = await service
    .from('employees')
    .select('auth_user_id, email')
    .eq('id', id)
    .single()

  if (getError) return NextResponse.json({ error: getError.message }, { status: 500 })

  // If email has changed, update auth.users
  if (email && email !== currentEmp.email) {
    const { error: authError } = await service.auth.admin.updateUserById(
      currentEmp.auth_user_id,
      { email }
    )
    if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  // Update employee profile
  const { data, error } = await service
    .from('employees')
    .update({
      email,
      full_name,
      branch_id: branch_id || null,
      designation,
      phone,
      is_active,
      salary: typeof salary === 'number' || typeof salary === 'string' ? Number(salary) || 0 : 0,
      employee_type: employee_type || 'onsite',
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing employee ID' }, { status: 400 })

  const service = createServiceClient()

  // Fetch auth_user_id first
  const { data: currentEmp, error: getError } = await service
    .from('employees')
    .select('auth_user_id')
    .eq('id', id)
    .single()

  if (getError) return NextResponse.json({ error: getError.message }, { status: 500 })

  // Delete from employees table first to avoid FK constraint issues when deleting auth user
  const { error: deleteEmpError } = await service
    .from('employees')
    .delete()
    .eq('id', id)

  if (deleteEmpError) return NextResponse.json({ error: deleteEmpError.message }, { status: 500 })

  // Then delete the auth user
  if (currentEmp?.auth_user_id) {
    const { error: authError } = await service.auth.admin.deleteUser(currentEmp.auth_user_id)
    if (authError) {
      console.error('Failed to delete auth user, but profile was deleted:', authError.message)
    }
  }

  return NextResponse.json({ success: true })
}