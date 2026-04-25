import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getPropertyId } from '@/lib/get-property-id'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const propertyId = await getPropertyId(supabase, user.id)
  if (!propertyId) return NextResponse.json({ error: 'No property found' }, { status: 404 })

  const { id } = await params
  const body = await req.json()

  const updates: Record<string, unknown> = {}
  if (body.name                 !== undefined) updates.name                 = body.name
  if (body.color                !== undefined) updates.color                = body.color
  if (body.x                    !== undefined) updates.x                    = body.x
  if (body.y                    !== undefined) updates.y                    = body.y
  if (body.width                !== undefined) updates.width                = body.width
  if (body.height               !== undefined) updates.height               = body.height
  if (body.description          !== undefined) updates.description          = body.description
  if (body.floor_plan_photo_url !== undefined) updates.floor_plan_photo_url = body.floor_plan_photo_url
  if (body.sort_order           !== undefined) updates.sort_order           = body.sort_order

  const { data, error } = await supabase
    .from('zones')
    .update(updates)
    .eq('id', id)
    .eq('property_id', propertyId)
    .select('id, name, color, x, y, width, height, description, floor_plan_photo_url, sort_order')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const propertyId = await getPropertyId(supabase, user.id)
  if (!propertyId) return NextResponse.json({ error: 'No property found' }, { status: 404 })

  const { id } = await params

  const { error } = await supabase
    .from('zones')
    .delete()
    .eq('id', id)
    .eq('property_id', propertyId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
