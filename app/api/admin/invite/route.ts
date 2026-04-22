import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify the caller is an owner of at least one property
  const { data: memberships } = await supabase
    .from('property_members')
    .select('role')
    .eq('user_id', user.id)

  const isOwner = (memberships ?? []).some(m => m.role === 'owner')
  if (!isOwner) {
    return NextResponse.json({ error: 'Only owners can invite members' }, { status: 403 })
  }

  const { email } = await request.json()
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

  const admin = createAdminClient()

  // Invite creates an account only — no property assignment.
  // The new user will be prompted to create their own property on first login.
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: {
      redirectTo: `${new URL(request.url).origin}/auth/confirm`,
    },
  })

  if (linkError || !linkData?.properties?.action_link) {
    return NextResponse.json({ error: linkError?.message ?? 'Failed to generate invite link' }, { status: 500 })
  }

  return NextResponse.json({ link: linkData.properties.action_link })
}
