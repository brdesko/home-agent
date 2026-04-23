import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getPropertyId } from '@/lib/get-property-id'

const anthropic = new Anthropic()

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const PROPERTY_ID = await getPropertyId(supabase, user.id)
  if (!PROPERTY_ID) return NextResponse.json({ error: 'No property found' }, { status: 404 })

  const { id } = await params
  const { projectName } = await req.json()

  // Mark task done
  const { data: task, error } = await supabase
    .from('tasks')
    .update({ status: 'done' })
    .eq('id', id)
    .eq('property_id', PROPERTY_ID)
    .select('id, title')
    .single()

  if (error || !task) return NextResponse.json({ error: error?.message }, { status: 500 })

  // Ask Claude Haiku if a follow-up question is warranted
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 80,
    messages: [{
      role: 'user',
      content: `Task "${task.title}" in project "${projectName}" was just marked complete.

Is this the kind of task where a brief follow-up would be useful? Tasks involving quotes, assessments, inspections, decisions, or reviews often have outcomes worth noting.

If yes, reply with one short follow-up question (e.g., "How did the contractor quotes come back?").
If no, reply with exactly: NO_FOLLOWUP`,
    }],
  })

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')
    .trim()

  const followUp = text === 'NO_FOLLOWUP' ? null : text

  return NextResponse.json({ followUp })
}
