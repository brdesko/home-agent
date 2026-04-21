import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getPropertyId } from '@/lib/get-property-id'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const propertyId = await getPropertyId(supabase, user.id)
  if (!propertyId) return NextResponse.json({ error: 'No property found' }, { status: 404 })

  const { project_id, description, estimated_amount, actual_amount } = await req.json()

  if (!project_id || !description)
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  const { data, error } = await supabase
    .from('budget_lines')
    .insert({
      property_id: propertyId,
      project_id,
      description,
      estimated_amount: estimated_amount ?? null,
      actual_amount:    actual_amount    ?? null,
    })
    .select('id, description, estimated_amount, actual_amount')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
