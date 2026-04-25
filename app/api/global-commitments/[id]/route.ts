import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getLatticeId } from '@/lib/get-lattice-id'

const VALID_DOMAINS = ['parcel', 'personal'] as const
const VALID_RECURRENCE = ['one_time', 'annual', 'monthly', 'quarterly'] as const

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const latticeId = await getLatticeId(supabase, user.id)
  if (!latticeId) return NextResponse.json({ error: 'No lattice found' }, { status: 404 })

  const { id } = await params
  const body = await req.json()

  const allowed = ['name', 'domain', 'amount', 'recurrence_type', 'target_year', 'target_quarter', 'notes'] as const
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 })
  }

  if ('name' in updates && !String(updates.name).trim()) {
    return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 })
  }
  if ('recurrence_type' in updates && !VALID_RECURRENCE.includes(updates.recurrence_type as typeof VALID_RECURRENCE[number])) {
    return NextResponse.json({ error: `recurrence_type must be one of: ${VALID_RECURRENCE.join(', ')}` }, { status: 400 })
  }
  if ('domain' in updates && updates.domain != null && !VALID_DOMAINS.includes(updates.domain as typeof VALID_DOMAINS[number])) {
    return NextResponse.json({ error: `domain must be one of: ${VALID_DOMAINS.join(', ')}` }, { status: 400 })
  }
  if ('target_quarter' in updates && updates.target_quarter != null) {
    const q = Number(updates.target_quarter)
    if (q < 1 || q > 4) return NextResponse.json({ error: 'target_quarter must be between 1 and 4' }, { status: 400 })
  }

  if ('name' in updates) updates.name = String(updates.name).trim()

  const { data, error } = await supabase
    .from('global_commitments')
    .update(updates)
    .eq('id', id)
    .eq('lattice_id', latticeId)
    .select('id, name, domain, amount, recurrence_type, target_year, target_quarter, notes, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data)  return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const latticeId = await getLatticeId(supabase, user.id)
  if (!latticeId) return NextResponse.json({ error: 'No lattice found' }, { status: 404 })

  const { id } = await params

  const { error, count } = await supabase
    .from('global_commitments')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('lattice_id', latticeId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}
