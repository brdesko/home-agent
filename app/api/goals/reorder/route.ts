import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orderedIds } = await req.json() as { orderedIds: string[] }
  if (!Array.isArray(orderedIds) || orderedIds.length === 0)
    return NextResponse.json({ error: 'orderedIds required' }, { status: 400 })

  // Update each goal's sort_order to match its position in the array
  const updates = orderedIds.map((id, i) =>
    supabase.from('goals').update({ sort_order: i + 1 }).eq('id', id)
  )
  await Promise.all(updates)

  return NextResponse.json({ success: true })
}
