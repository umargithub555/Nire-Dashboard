import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, buildCredentialsEmailHtml } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { employeeId, newPassword } = await req.json()
    if (!employeeId || !newPassword) {
      return NextResponse.json({ error: 'Missing employeeId or newPassword' }, { status: 400 })
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 })
    }

    const service = createServiceClient()

    // 1. Fetch employee details
    const { data: employee, error: getError } = await service
      .from('employees')
      .select('id, full_name, email, auth_user_id')
      .eq('id', employeeId)
      .single()

    if (getError || !employee) {
      return NextResponse.json({ error: getError?.message || 'Employee not found' }, { status: 404 })
    }

    // 2. Update Supabase Auth user password
    const { error: authError } = await service.auth.admin.updateUserById(
      employee.auth_user_id,
      { password: newPassword }
    )

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    // 3. Send email to employee with their new password via Gmail SMTP
    const origin = req.nextUrl.origin || 'http://localhost:3000'
    const subject = 'Security Notification — Your Nire Password Has Been Reset'
    const htmlContent = buildCredentialsEmailHtml({
      fullName: employee.full_name,
      email: employee.email,
      password: newPassword,
      appUrl: origin,
      type: 'reset',
    })

    const emailResult = await sendEmail({
      to: employee.email,
      subject,
      html: htmlContent,
    })

    return NextResponse.json({
      success: true,
      message: `Password updated successfully for ${employee.full_name}.`,
      emailDelivered: emailResult.success,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}

