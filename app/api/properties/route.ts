import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  // Verify auth with user client
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const name    = (body.name    as string | undefined)?.trim()
  const address = (body.address as string | undefined)?.trim() ?? null

  if (!name) return NextResponse.json({ error: 'Property name is required' }, { status: 400 })

  // Use admin client for writes — RLS bootstrap problem (no membership exists yet)
  const admin = createAdminClient()

  const { data: property, error: propErr } = await admin
    .from('properties')
    .insert({ name, address })
    .select('id, name, address')
    .single()

  if (propErr) return NextResponse.json({ error: propErr.message }, { status: 500 })

  const { error: memberErr } = await admin
    .from('property_members')
    .insert({ property_id: property.id, user_id: user.id, role: 'owner' })

  if (memberErr) return NextResponse.json({ error: memberErr.message }, { status: 500 })

  return NextResponse.json(property, { status: 201 })
}
