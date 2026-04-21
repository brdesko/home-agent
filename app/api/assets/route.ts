import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getPropertyId } from '@/lib/get-property-id'

const COLS = 'id, name, asset_type, description, make, model, serial_number, install_date, last_serviced_at, location, notes, created_at'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const propertyId = await getPropertyId(supabase, user.id)
  if (!propertyId) return NextResponse.json({ error: 'No property found' }, { status: 404 })

  const { data, error } = await supabase
    .from('assets')
    .select(COLS)
    .eq('property_id', propertyId)
    .order('asset_type')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const propertyId = await getPropertyId(supabase, user.id)
  if (!propertyId) return NextResponse.json({ error: 'No property found' }, { status: 404 })

  const body = await req.json()
  const { name, asset_type, description, make, model, serial_number, install_date, last_serviced_at, location, notes } = body
  if (!name || !asset_type)
    return NextResponse.json({ error: 'name and asset_type are required' }, { status: 400 })

  const { data, error } = await supabase
    .from('assets')
    .insert({
      property_id:      propertyId,
      name,
      asset_type,
      description:      description      ?? null,
      make:             make             ?? null,
      model:            model            ?? null,
      serial_number:    serial_number    ?? null,
      install_date:     install_date     ?? null,
      last_serviced_at: last_serviced_at ?? null,
      location:         location         ?? null,
      notes:            notes            ?? null,
    })
    .select(COLS)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
