import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { property_id, role = 'owner' } = await request.json()
  if (!property_id) return NextResponse.json({ error: 'property_id required' }, { status: 400 })

  const admin = createAdminClient()

  const { count } = await admin
    .from('property_members')
    .select('*', { count: 'exact', head: true })
    .eq('property_id', property_id)
    .eq('user_id', user.id)

  if (count === 0) {
    await admin.from('property_members').insert({ property_id, user_id: user.id, role })
  }

  return NextResponse.json({ ok: true })
}
