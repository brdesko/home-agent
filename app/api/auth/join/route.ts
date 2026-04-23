import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Membership is pre-created at invite time by admin/invite.
// This route exists as a confirmation step for the auth/confirm flow.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json({ ok: true })
}
