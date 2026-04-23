import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getPropertyId } from '@/lib/get-property-id'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const PROPERTY_ID = await getPropertyId(supabase, user.id)
  if (!PROPERTY_ID) return NextResponse.json({ error: 'No property found' }, { status: 404 })

  const { id } = await params
  const body = await req.json()
  const updates: Record<string, unknown> = {}
  if ('description'      in body) updates.description      = body.description
  if ('estimated_amount' in body) updates.estimated_amount = body.estimated_amount === '' ? null : Number(body.estimated_amount)
  if ('actual_amount'    in body) updates.actual_amount    = body.actual_amount    === '' ? null : Number(body.actual_amount)

  const { data, error } = await supabase
    .from('budget_lines')
    .update(updates)
    .eq('id', id)
    .eq('property_id', PROPERTY_ID)
    .select('id, description, estimated_amount, actual_amount')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const PROPERTY_ID = await getPropertyId(supabase, user.id)
  if (!PROPERTY_ID) return NextResponse.json({ error: 'No property found' }, { status: 404 })

  const { id } = await params
  const { error } = await supabase.from('budget_lines').delete().eq('id', id).eq('property_id', PROPERTY_ID)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
