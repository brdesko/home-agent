import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getPropertyId } from '@/lib/get-property-id'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const PROPERTY_ID = await getPropertyId(supabase, user.id)
  if (!PROPERTY_ID) return NextResponse.json({ error: 'No property found' }, { status: 404 })

  const { orderedIds } = await req.json() as { orderedIds: string[] }
  if (!Array.isArray(orderedIds) || orderedIds.length === 0)
    return NextResponse.json({ error: 'orderedIds required' }, { status: 400 })

  // Verify all IDs belong to the active property before updating
  const { data: ownedGoals } = await supabase
    .from('goals')
    .select('id')
    .eq('property_id', PROPERTY_ID)
    .in('id', orderedIds)

  const ownedIds = new Set(ownedGoals?.map(g => g.id) ?? [])
  if (orderedIds.some(id => !ownedIds.has(id)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const updates = orderedIds.map((id, i) =>
    supabase.from('goals').update({ sort_order: i + 1 }).eq('id', id).eq('property_id', PROPERTY_ID)
  )
  await Promise.all(updates)

  return NextResponse.json({ success: true })
}
