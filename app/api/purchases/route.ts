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
    .from('purchases')
    .select('*, projects(name)')
    .eq('property_id', propertyId)
    .order('purchased_at', { ascending: false })
    .order('created_at', { ascending: false })

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
  const { item_name, vendor, price, purchased_at, project_id, category, notes } = body

  if (!item_name) return NextResponse.json({ error: 'item_name is required' }, { status: 400 })

  const { data, error } = await supabase
    .from('purchases')
    .insert({
      property_id: propertyId,
      item_name,
      vendor:       vendor       ?? null,
      price:        price        ?? null,
      purchased_at: purchased_at ?? new Date().toISOString().split('T')[0],
      project_id:   project_id   ?? null,
      category:     category     ?? null,
      notes:        notes        ?? null,
    })
    .select('*, projects(name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
