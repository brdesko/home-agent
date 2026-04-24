import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getPropertyId } from '@/lib/get-property-id'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const propertyId = await getPropertyId(supabase, user.id)
  if (!propertyId) return NextResponse.json({ error: 'No property found' }, { status: 404 })

  const zoneId = new URL(req.url).searchParams.get('zone_id')

  let query = supabase
    .from('rooms')
    .select('id, zone_id, name, status, notes, sort_order, pos_x, pos_y, pos_w, pos_h, created_at')
    .eq('property_id', propertyId)
    .order('sort_order')
    .order('name')

  if (zoneId) query = query.eq('zone_id', zoneId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const propertyId = await getPropertyId(supabase, user.id)
  if (!propertyId) return NextResponse.json({ error: 'No property found' }, { status: 404 })

  const { zone_id, name, status, notes, sort_order } = await req.json()
  if (!zone_id) return NextResponse.json({ error: 'zone_id is required' }, { status: 400 })
  if (!name)    return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const { data, error } = await supabase
    .from('rooms')
    .insert({
      property_id: propertyId,
      zone_id,
      name,
      status:     status     ?? 'not_started',
      notes:      notes      ?? null,
      sort_order: sort_order ?? 0,
    })
    .select('id, zone_id, name, status, notes, sort_order, pos_x, pos_y, pos_w, pos_h, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
