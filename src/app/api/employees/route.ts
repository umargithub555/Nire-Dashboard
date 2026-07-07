import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function sendCredentialsEmail(email: string, password: string, fullName: string, origin: string) {
  const apiKey = process.env.RESEND_API_KEY
  const appUrl = origin || 'http://localhost:3000'

  const subject = 'Your Nire Account Credentials'
  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; border-radius: 12px;">
      <h2 style="color: #2563eb; margin-top: 0;">Welcome to Nire, ${fullName}!</h2>
      <p style="color: #3f3f46; line-height: 1.5;">Your manager has created an account for you on Nire Dashboard.</p>
      <p style="color: #3f3f46; line-height: 1.5;">Here are the credentials you will use to log in:</p>
      <div style="background-color: #f4f4f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0;"><strong>Login Page:</strong> <a href="${appUrl}/login">${appUrl}/login</a></p>
        <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${email}</p>
        <p style="margin: 0;"><strong>Password:</strong> ${password}</p>
      </div>
      <p style="color: #3f3f46; line-height: 1.5;">Please log in and change your password in your settings as soon as possible.</p>
      <p style="color: #71717a; font-size: 12px; margin-top: 30px; border-top: 1px solid #e4e4e7; padding-top: 15px;">
        This is an automated message. Please do not reply directly to this email.
      </p>
    </div>
  `

  if (!apiKey) {
    console.log(`
=========================================
[MOCK EMAIL SENT]
To: ${fullName} <${email}>
Subject: ${subject}
Body:
${htmlContent.replace(/<[^>]*>/g, '')}
=========================================
    `)
    return
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Nire Onboarding <onboarding@resend.dev>',
        to: [email],
        subject: subject,
        html: htmlContent,
      }),
    })

    if (!res.ok) {
      const errorData = await res.json()
      console.error('Failed to send email via Resend API:', errorData)
    } else {
      console.log(`Onboarding email successfully sent to ${email} via Resend.`)
    }
  } catch (err) {
    console.error('Error in sendCredentialsEmail:', err)
  }
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
  const { email, password, full_name, branch_id, designation, phone } = body
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
  const { email, full_name, branch_id, designation, phone, is_active } = body
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