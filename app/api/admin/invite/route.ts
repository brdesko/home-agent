import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const PROPERTY_ID = 'a1b2c3d4-0000-0000-0000-000000000001'

function buildEmailHtml(inviteUrl: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f5f3ef;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ef;padding:48px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#3d6b55;padding:28px 40px;">
            <p style="margin:0;font-family:'Georgia',serif;font-size:22px;font-weight:normal;color:#ffffff;letter-spacing:0.02em;">Parcel</p>
            <p style="margin:4px 0 0;font-size:11px;color:rgba(255,255,255,0.6);letter-spacing:0.12em;text-transform:uppercase;font-family:Arial,sans-serif;">Property Notebook</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 32px;">
            <p style="margin:0 0 20px;font-size:17px;line-height:1.6;color:#3a3530;">
              You've been invited to the <strong style="color:#3d6b55;">5090 Durham Rd</strong> property notebook.
            </p>
            <p style="margin:0 0 28px;font-size:15px;line-height:1.7;color:#6b645c;">
              Parcel is where we keep everything about the property in one place — projects, budgets, seasonal plans, and the things we want to get done. Think of it as a shared brain for the house.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
              <tr>
                <td style="background:#3d6b55;border-radius:8px;">
                  <a href="${inviteUrl}" style="display:inline-block;padding:14px 32px;font-family:Arial,sans-serif;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.02em;">
                    Open the notebook →
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 6px;font-size:13px;color:#9c9188;line-height:1.6;">
              You'll be asked to set a password on your first visit. After that, you can log in any time.
            </p>
            <p style="margin:0;font-size:13px;color:#9c9188;line-height:1.6;">
              If you weren't expecting this, you can safely ignore it — no account will be created unless you click the link.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px 28px;border-top:1px solid #f0ece6;">
            <p style="margin:0;font-size:12px;color:#b8b0a6;font-family:Arial,sans-serif;">Parcel · 5090 Durham Rd, Pipersville, PA</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function POST(request: Request) {
  // Only owners may send invitations
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase
    .from('property_members')
    .select('role')
    .eq('property_id', PROPERTY_ID)
    .eq('user_id', user.id)
    .single()

  if (member?.role !== 'owner') {
    return NextResponse.json({ error: 'Only owners can invite members' }, { status: 403 })
  }

  const { email, role = 'owner' } = await request.json()
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

  const admin = createAdminClient()

  // Generate the invite link without sending an email
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      data: { property_id: PROPERTY_ID, role },
    },
  })

  if (linkError || !linkData?.properties?.action_link) {
    return NextResponse.json({ error: linkError?.message ?? 'Failed to generate invite link' }, { status: 500 })
  }

  // Send the email via Resend
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Parcel <onboarding@resend.dev>',
      to: email,
      subject: "You're invited to the 5090 Durham Rd notebook",
      html: buildEmailHtml(linkData.properties.action_link),
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    return NextResponse.json({ error: err.message ?? 'Failed to send email' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
