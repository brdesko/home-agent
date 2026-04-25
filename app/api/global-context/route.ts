import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getLatticeId } from '@/lib/get-lattice-id'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const latticeId = await getLatticeId(supabase, user.id)
  if (!latticeId) return NextResponse.json({ error: 'No lattice found' }, { status: 404 })

  const { data, error } = await supabase
    .from('global_context')
    .select('goals, planning_assumptions, risk_preferences, thresholds, updated_at')
    .eq('lattice_id', latticeId)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Return defaults if no row exists yet — context is created on first PATCH
  return NextResponse.json(data ?? {
    goals: [],
    planning_assumptions: {},
    risk_preferences: {},
    thresholds: {},
    updated_at: null,
  })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const latticeId = await getLatticeId(supabase, user.id)
  if (!latticeId) return NextResponse.json({ error: 'No lattice found' }, { status: 404 })

  const body = await req.json()
  const allowed = ['goals', 'planning_assumptions', 'risk_preferences', 'thresholds'] as const
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('global_context')
    .upsert(
      { lattice_id: latticeId, ...updates, updated_at: new Date().toISOString() },
      { onConflict: 'lattice_id' }
    )
    .select('goals, planning_assumptions, risk_preferences, thresholds, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
