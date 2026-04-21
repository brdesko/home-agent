import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

type Ctx = { params: Promise<{ id: string }> }
const COLS = 'id, name, asset_type, description, make, model, serial_number, install_date, last_serviced_at, location, notes, created_at'

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const allowed = ['name', 'asset_type', 'description', 'make', 'model', 'serial_number', 'install_date', 'last_serviced_at', 'location', 'notes']
  const updates: Record<string, unknown> = {}
  for (const k of allowed) {
    if (k in body) updates[k] = body[k]
  }
  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const { data, error } = await supabase
    .from('assets')
    .update(updates)
    .eq('id', id)
    .select(COLS)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { error } = await supabase.from('assets').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
