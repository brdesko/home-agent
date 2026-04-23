import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getPropertyId } from '@/lib/get-property-id'

const VALID_STATUSES  = ['planned', 'active', 'on_hold', 'complete', 'cancelled']
const VALID_PRIORITIES = ['low', 'medium', 'high']
const VALID_EFFORTS   = ['low', 'medium', 'high', 'very_high']

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const propertyId = await getPropertyId(supabase, user.id)
  if (!propertyId) return NextResponse.json({ error: 'No property found' }, { status: 404 })

  const body = await req.json()
  const { name, domain, status, priority, effort, target_year, target_quarter,
          description, goal_id, actual_spend, target_budget, parent_project_id } = body

  if (!name || !domain || !status || !priority)
    return NextResponse.json({ error: 'name, domain, status, and priority are required' }, { status: 400 })
  if (!VALID_STATUSES.includes(status))
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  if (!VALID_PRIORITIES.includes(priority))
    return NextResponse.json({ error: 'Invalid priority' }, { status: 400 })
  if (effort && !VALID_EFFORTS.includes(effort))
    return NextResponse.json({ error: 'Invalid effort' }, { status: 400 })

  const { data, error } = await supabase
    .from('projects')
    .insert({
      property_id:       propertyId,
      name,
      domain,
      status,
      priority,
      effort:            effort            ?? null,
      target_year:       target_year       ?? null,
      target_quarter:    target_quarter    ?? null,
      description:       description       ?? null,
      goal_id:           goal_id           ?? null,
      actual_spend:      actual_spend      ?? null,
      target_budget:     target_budget     ?? null,
      parent_project_id: parent_project_id ?? null,
    })
    .select('id, name, domain, status, priority, effort, target_year, target_quarter, description, goal_id, actual_spend, target_budget, parent_project_id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
