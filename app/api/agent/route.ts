import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getPropertyId } from '@/lib/get-property-id'
import { tools } from '@/lib/agent/tools'
import { buildSystemPrompt } from '@/lib/agent/system-prompt'
import { runTool } from '@/lib/agent/handlers'
import type { ProjectCreated, ChangeResult } from '@/lib/agent/types'

const anthropic = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const PROPERTY_ID = await getPropertyId(supabase, user.id)
    if (!PROPERTY_ID) return NextResponse.json({ error: 'No property found' }, { status: 404 })

    const { messages } = await req.json()

    const [{ data: projectData }, { data: goalData }, { data: refData }, { data: propData }] = await Promise.all([
      supabase.from('projects').select('id, name, domain, status, priority, goal_id').eq('property_id', PROPERTY_ID).order('name'),
      supabase.from('goals').select('id, name, status, target_budget, sort_order').eq('property_id', PROPERTY_ID).order('sort_order').order('name'),
      supabase.from('saved_references').select('type, name, notes').eq('property_id', PROPERTY_ID).order('type').order('name'),
      supabase.from('properties').select('name, address').eq('id', PROPERTY_ID).single(),
    ])

    const projects   = projectData ?? []
    const goals      = goalData    ?? []
    const references = refData     ?? []
    const property   = { name: propData?.name ?? 'this property', address: propData?.address ?? null }
    const now        = new Date()
    const systemPrompt = buildSystemPrompt(property, projects, goals, references, {
      today:          now.toISOString().split('T')[0],
      currentYear:    now.getFullYear(),
      currentQuarter: Math.ceil((now.getMonth() + 1) / 3),
    })

    let projectCreated: ProjectCreated | null = null
    const changes: ChangeResult[] = []

    let currentMessages: Anthropic.MessageParam[] = messages.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    for (let i = 0; i < 10; i++) {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
        messages: currentMessages,
        tools,
      })

      if (response.stop_reason === 'end_turn') {
        const text = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map(b => b.text)
          .join('')
        return NextResponse.json({ response: text, projectCreated, changes })
      }

      if (response.stop_reason !== 'tool_use') break

      const toolResults: Anthropic.ToolResultBlockParam[] = []

      for (const block of response.content) {
        if (block.type !== 'tool_use') continue
        const result = await runTool(block, {
          supabase,
          propertyId: PROPERTY_ID,
          anthropic,
          changes,
          onProjectCreated: (p) => { projectCreated = p },
        })
        toolResults.push(result)
      }

      currentMessages = [
        ...currentMessages,
        { role: 'assistant', content: response.content },
        { role: 'user',      content: toolResults },
      ]
    }

    return NextResponse.json({ response: 'Something went wrong. Please try again.', projectCreated: null, changes: [] })
  } catch (err) {
    console.error('[agent] unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error', response: 'Something went wrong on our end. Please try again.' }, { status: 500 })
  }
}
