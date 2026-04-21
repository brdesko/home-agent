import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getPropertyId } from '@/lib/get-property-id'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const propertyId = await getPropertyId(supabase, user.id)
  if (!propertyId) return NextResponse.json({ error: 'No property found' }, { status: 404 })

  const body = await req.json()
  const { type, name, notes, url } = body

  if (!type || !name)
    return NextResponse.json({ error: 'type and name are required' }, { status: 400 })

  const { data, error } = await supabase
    .from('saved_references')
    .insert({ property_id: propertyId, type, name, notes: notes ?? null, url: url ?? null })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
