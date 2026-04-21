import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getPropertyId } from '@/lib/get-property-id'

const VALID_TYPES = ['vacation', 'holiday', 'busy', 'sale_window', 'other']

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const propertyId = await getPropertyId(supabase, user.id)
  if (!propertyId) return NextResponse.json({ error: 'No property found' }, { status: 404 })

  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('property_id', propertyId)
    .order('start_date')

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
  const { title, start_date, end_date, type, notes } = body

  if (!title || !start_date || !end_date)
    return NextResponse.json({ error: 'title, start_date, and end_date are required' }, { status: 400 })
  if (!VALID_TYPES.includes(type))
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })

  const { data, error } = await supabase
    .from('calendar_events')
    .insert({ property_id: propertyId, title, start_date, end_date, type, notes: notes ?? null })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
