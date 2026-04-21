import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { property_id } = await req.json()
  if (!property_id) return NextResponse.json({ error: 'property_id required' }, { status: 400 })

  const { data } = await supabase
    .from('property_members')
    .select('property_id')
    .eq('property_id', property_id)
    .eq('user_id', user.id)
    .single()

  if (!data) return NextResponse.json({ error: 'Not a member of this property' }, { status: 403 })

  const cookieStore = await cookies()
  cookieStore.set('parcel_property_id', property_id, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: true,
    sameSite: 'lax',
  })

  return NextResponse.json({ ok: true })
}
