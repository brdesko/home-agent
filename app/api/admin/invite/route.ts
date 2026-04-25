import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const VALID_ROLES = ['owner', 'member']

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email, property_id, role = 'member' } = await request.json()
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })
  if (!VALID_ROLES.includes(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 })

  if (property_id) {
    // Sharing an existing property — verify the caller owns it
    const { data: membership } = await supabase
      .from('property_members')
      .select('role')
      .eq('property_id', property_id)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.role !== 'owner')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  } else {
    // Account-only invite — verify the caller is an owner of at least one property
    const { data: memberships } = await supabase
      .from('property_members')
      .select('role')
      .eq('user_id', user.id)

    const isOwner = (memberships ?? []).some(m => m.role === 'owner')
    if (!isOwner)
      return NextResponse.json({ error: 'Only owners can invite members' }, { status: 403 })
  }

  const admin = createAdminClient()

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

  // Pre-create the membership so auth/join never needs to accept arbitrary IDs
  if (property_id && linkData.user?.id) {
    const { count } = await admin
      .from('property_members')
      .select('*', { count: 'exact', head: true })
      .eq('property_id', property_id)
      .eq('user_id', linkData.user.id)

    if (count === 0) {
      await admin.from('property_members').insert({ property_id, user_id: linkData.user.id, role })
    }
  }

  return NextResponse.json({ link: linkData.properties.action_link })
}
