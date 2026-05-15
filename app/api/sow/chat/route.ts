import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic()

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { model, max_tokens, system, messages } = await req.json()

  const response = await anthropic.messages.create({
    model:      model      ?? 'claude-haiku-4-5-20251001',
    max_tokens: max_tokens ?? 1024,
    system,
    messages,
  })

  return NextResponse.json(response)
}
