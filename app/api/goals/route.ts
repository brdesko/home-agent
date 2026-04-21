import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getPropertyId } from '@/lib/get-property-id'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const propertyId = await getPropertyId(supabase, user.id)
  if (!propertyId) return NextResponse.json({ error: 'No property found' }, { status: 404 })

  const { name, description, priority, target_budget } = await req.json()
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const { count } = await supabase
    .from('goals')
    .select('*', { count: 'exact', head: true })
    .eq('property_id', propertyId)

  const { data, error } = await supabase
    .from('goals')
    .insert({
      property_id:   propertyId,
      name,
      description:   description   ?? null,
      priority:      priority      ?? 'medium',
      target_budget: target_budget ?? null,
      status:        'active',
      sort_order:    (count ?? 0) + 1,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
