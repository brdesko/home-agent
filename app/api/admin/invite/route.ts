import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const PROPERTY_ID = 'a1b2c3d4-0000-0000-0000-000000000001'

export async function POST(request: Request) {
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

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
      data: { property_id: PROPERTY_ID, role },
    },
  })

  if (linkError || !linkData?.properties?.action_link) {
    return NextResponse.json({ error: linkError?.message ?? 'Failed to generate invite link' }, { status: 500 })
  }

  return NextResponse.json({ link: linkData.properties.action_link })
}
