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
  if (body.name       !== undefined) updates.name       = body.name
  if (body.status     !== undefined) updates.status     = body.status
  if (body.notes      !== undefined) updates.notes      = body.notes
  if (body.sort_order !== undefined) updates.sort_order = body.sort_order
  if (body.pos_x      !== undefined) updates.pos_x      = body.pos_x
  if (body.pos_y      !== undefined) updates.pos_y      = body.pos_y
  if (body.pos_w      !== undefined) updates.pos_w      = body.pos_w
  if (body.pos_h      !== undefined) updates.pos_h      = body.pos_h

  const { data, error } = await supabase
    .from('spaces')
    .update(updates)
    .eq('id', id)
    .eq('property_id', propertyId)
    .select('id, zone_id, name, status, notes, sort_order, pos_x, pos_y, pos_w, pos_h')
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
    .from('spaces')
    .delete()
    .eq('id', id)
    .eq('property_id', propertyId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
