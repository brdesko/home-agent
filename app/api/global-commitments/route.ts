import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getLatticeId } from '@/lib/get-lattice-id'

const VALID_DOMAINS = ['parcel', 'personal'] as const
const VALID_RECURRENCE = ['one_time', 'annual', 'monthly', 'quarterly'] as const

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const latticeId = await getLatticeId(supabase, user.id)
  if (!latticeId) return NextResponse.json({ error: 'No lattice found' }, { status: 404 })

  const { data, error } = await supabase
    .from('global_commitments')
    .select('id, name, domain, amount, recurrence_type, target_year, target_quarter, notes, created_at')
    .eq('lattice_id', latticeId)
    .order('target_year', { ascending: true, nullsFirst: false })
    .order('target_quarter', { ascending: true, nullsFirst: false })
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const latticeId = await getLatticeId(supabase, user.id)
  if (!latticeId) return NextResponse.json({ error: 'No lattice found' }, { status: 404 })

  const { name, domain, amount, recurrence_type, target_year, target_quarter, notes } = await req.json()

  if (!name?.trim())     return NextResponse.json({ error: 'name is required' }, { status: 400 })
  if (amount == null)    return NextResponse.json({ error: 'amount is required' }, { status: 400 })
  if (!recurrence_type)  return NextResponse.json({ error: 'recurrence_type is required' }, { status: 400 })

  if (!VALID_RECURRENCE.includes(recurrence_type)) {
    return NextResponse.json({ error: `recurrence_type must be one of: ${VALID_RECURRENCE.join(', ')}` }, { status: 400 })
  }
  if (domain != null && !VALID_DOMAINS.includes(domain)) {
    return NextResponse.json({ error: `domain must be one of: ${VALID_DOMAINS.join(', ')}` }, { status: 400 })
  }
  if (target_quarter != null && (target_quarter < 1 || target_quarter > 4)) {
    return NextResponse.json({ error: 'target_quarter must be between 1 and 4' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('global_commitments')
    .insert({
      lattice_id:     latticeId,
      name:           name.trim(),
      domain:         domain         ?? null,
      amount,
      recurrence_type,
      target_year:    target_year    ?? null,
      target_quarter: target_quarter ?? null,
      notes:          notes          ?? null,
    })
    .select('id, name, domain, amount, recurrence_type, target_year, target_quarter, notes, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
