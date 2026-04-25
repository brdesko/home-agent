import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getPropertyId } from '@/lib/get-property-id'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const propertyId = await getPropertyId(supabase, user.id)
  if (!propertyId) return NextResponse.json({ error: 'No property found' }, { status: 404 })

  const { data, error } = await supabase
    .from('zones')
    .select('id, name, color, x, y, width, height, description, floor_plan_photo_url, sort_order, created_at')
    .eq('property_id', propertyId)
    .order('sort_order')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const propertyId = await getPropertyId(supabase, user.id)
  if (!propertyId) return NextResponse.json({ error: 'No property found' }, { status: 404 })

  const { name, color, x, y, width, height, description, floor_plan_photo_url, sort_order } = await req.json()
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const { data, error } = await supabase
    .from('zones')
    .insert({
      property_id:          propertyId,
      name,
      color:                color                ?? '#94a3b8',
      x:                    x                    ?? 0,
      y:                    y                    ?? 0,
      width:                width                ?? 20,
      height:               height               ?? 20,
      description:          description          ?? null,
      floor_plan_photo_url: floor_plan_photo_url ?? null,
      sort_order:           sort_order           ?? 0,
    })
    .select('id, name, color, x, y, width, height, description, floor_plan_photo_url, sort_order, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
