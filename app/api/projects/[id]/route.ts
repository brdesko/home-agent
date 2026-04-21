import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const VALID_STATUSES = ['planned', 'active', 'on_hold', 'complete', 'cancelled']

  const updates: Record<string, unknown> = {}
  if ('target_budget' in body) updates.target_budget = body.target_budget
  if ('actual_spend'  in body) updates.actual_spend  = body.actual_spend
  if ('goal_id'       in body) updates.goal_id       = body.goal_id
  if ('status' in body) {
    if (!VALID_STATUSES.includes(body.status))
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    updates.status = body.status
  }

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id)
    .select('id, status, target_budget, actual_spend, goal_id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
