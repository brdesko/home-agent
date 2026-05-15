import { createClient } from '@/lib/supabase/server'
import { getLatticeId } from '@/lib/get-lattice-id'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const latticeId = await getLatticeId(supabase, user.id)
  if (!latticeId) return NextResponse.json({ error: 'No lattice found' }, { status: 404 })

  const { data, error } = await supabase
    .from('garden_data')
    .select('data')
    .eq('lattice_id', latticeId)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: data?.data ?? null })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const latticeId = await getLatticeId(supabase, user.id)
  if (!latticeId) return NextResponse.json({ error: 'No lattice found' }, { status: 404 })

  const { data: body } = await req.json()

  const { error } = await supabase
    .from('garden_data')
    .upsert(
      { lattice_id: latticeId, data: body, updated_at: new Date().toISOString() },
      { onConflict: 'lattice_id' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
