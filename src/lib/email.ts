import nodemailer from 'nodemailer'

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  const smtpUser = process.env.SMTP_USER
  const smtpPass = process.env.SMTP_PASS
  const smtpFrom = process.env.SMTP_FROM || smtpUser || 'noreply@nire.com'

  if (!smtpUser || !smtpPass) {
    console.log(`
======================== MOCK EMAIL (No SMTP Credentials in .env.local) ========================
To: ${to}
Subject: ${subject}
Body:
${html.replace(/<[^>]*>/g, '')}
================================================================================================
    `)
    return { success: false, reason: 'No SMTP_USER or SMTP_PASS in .env.local' }
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpUser,
        pass: smtpPass.replace(/\s+/g, ''), // Strip spaces from app password if present
      },
    })

    const info = await transporter.sendMail({
      from: `"Nire Portal" <${smtpFrom}>`,
      to,
      subject,
      html,
    })

    console.log(`[SMTP SUCCESS] Email delivered to ${to} (Message ID: ${info.messageId})`)
    return { success: true, messageId: info.messageId }
  } catch (error: any) {
    console.error('[SMTP ERROR] Failed to deliver email via Gmail SMTP:', error)
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Modern HTML Template for Nire Onboarding & Password Reset Emails
 */
export function buildCredentialsEmailHtml({
  fullName,
  email,
  password,
  appUrl,
  type = 'welcome',
}: {
  fullName: string
  email: string
  password: string
  appUrl: string
  type?: 'welcome' | 'reset'
}) {
  const isWelcome = type === 'welcome'
  const title = isWelcome ? 'Welcome to Nire Staff Portal' : 'Password Reset Notification'
  const badgeText = isWelcome ? 'New Account Created' : 'Security Update'
  const badgeColor = isWelcome ? '#2563eb' : '#d97706'
  const message = isWelcome
    ? 'Your administrator has set up a new employee account for you on the Nire Management System. Below are your official login credentials to access the mobile app.'
    : 'Your administrator has updated your account password. Below are your new official login credentials to access the mobile app.'

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 540px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 36px 32px 32px 32px; text-align: center;">
              <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.15); padding: 6px 16px; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.25); margin-bottom: 14px;">
                <span style="color: #ffffff; font-weight: 800; font-size: 18px; letter-spacing: 2px;">NIRE</span>
              </div>
              <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0; letter-spacing: -0.3px;">
                ${title}
              </h1>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 32px 28px 32px;">
              <div style="display: inline-block; background-color: ${isWelcome ? '#eff6ff' : '#fffbe5'}; color: ${badgeColor}; border: 1px solid ${isWelcome ? '#bfdbfe' : '#fde68a'}; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 6px; letter-spacing: 0.5px; margin-bottom: 16px;">
                ${badgeText}
              </div>

              <p style="color: #0f172a; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">
                Hello ${fullName},
              </p>
              
              <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
                ${message}
              </p>

              <!-- Credentials Card -->
              <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px 24px; margin-bottom: 24px;">
                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.8px; margin-bottom: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
                  Mobile App Login Credentials
                </div>
                
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="padding-bottom: 10px; color: #64748b; font-size: 13px; width: 120px; font-weight: 500;">Mobile App:</td>
                    <td style="padding-bottom: 10px; color: #0f172a; font-weight: 600; font-size: 13px;">
                      📱 Nire Employee App (Android)
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-bottom: 10px; color: #64748b; font-size: 13px; font-weight: 500;">Email / Username:</td>
                    <td style="padding-bottom: 10px; color: #0f172a; font-weight: 600; font-size: 13px;">${email}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b; font-size: 13px; font-weight: 500;">${isWelcome ? 'Password:' : 'New Password:'}</td>
                    <td>
                      <span style="background-color: #ffffff; color: #0f172a; font-weight: 700; font-family: 'Courier New', Courier, monospace; font-size: 15px; padding: 6px 12px; border-radius: 6px; border: 1px solid #94a3b8; display: inline-block; letter-spacing: 1px;">
                        ${password}
                      </span>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Mobile App CTA Banner -->
              <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px 20px; text-align: center; margin-bottom: 24px;">
                <p style="color: #1e40af; font-size: 14px; font-weight: 700; margin: 0 0 4px 0;">
                  📱 Open Your Nire Employee App
                </p>
                <p style="color: #1d4ed8; font-size: 12px; margin: 0;">
                  Open the Nire Employee App on your phone and enter your credentials above to sign in.
                </p>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="color: #64748b; font-size: 12px; font-weight: 600; margin: 0 0 4px 0;">
                Nire Employee Tracking & Management System
              </p>
              <p style="color: #94a3b8; font-size: 11px; margin: 0;">
                This is an automated system notification. Please do not reply directly to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}
