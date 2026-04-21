import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getPropertyId } from '@/lib/get-property-id'

const anthropic = new Anthropic()

type ProjectSummary = {
  name: string
  description?: string | null
  domain?: string | null
  effort?: string | null
  target_budget?: number | null
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const propertyId = await getPropertyId(supabase, user.id)
  if (!propertyId) return NextResponse.json({ error: 'No property found' }, { status: 404 })

  const { project, messages } = await req.json() as {
    project: ProjectSummary
    messages: { role: 'user' | 'assistant'; content: string }[]
  }

  const effortMap: Record<string, string> = {
    low: 'low (a weekend or two)',
    medium: 'medium (a few weeks)',
    high: 'high (months)',
    very_high: 'very high (major undertaking)',
  }

  const systemPrompt = `You are a project cost estimation assistant for Parcel, a property management app for a 5.3-acre residential property in Pipersville, PA.

Your goal is to help the owner set a realistic target budget for a home improvement or farm project.

Ask one or two questions at a time about:
- Scope and scale of the work
- DIY vs. contractor-led vs. mixed
- Key materials or equipment
- Labor estimate (hours or contractor days)
- Permits, engineering, or professional services
- Comparable work they've done before

Be conversational. Draw on realistic Pennsylvania rural/residential cost ranges.

Project: ${project.name}
${project.description ? `Description: ${project.description}` : ''}
${project.domain ? `Domain: ${project.domain}` : ''}
${project.effort ? `Effort level: ${effortMap[project.effort] ?? project.effort}` : ''}
${project.target_budget ? `Current target budget: $${project.target_budget.toLocaleString()}` : 'No target budget set yet.'}

When you have enough to make a confident estimate, explain your reasoning briefly and end with:

<suggestions>
{"target_budget": 45000}
</suggestions>

Only suggest after at least one exchange. Round to the nearest $500.`

  const convo: Anthropic.MessageParam[] = messages.length > 0
    ? messages.map(m => ({ role: m.role, content: m.content }))
    : [{ role: 'user', content: `Help me estimate a budget for: ${project.name}` }]

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    system: systemPrompt,
    messages: convo,
  })

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')

  const match = text.match(/<suggestions>([\s\S]*?)<\/suggestions>/)
  let suggestions: { target_budget?: number } | null = null
  let message = text

  if (match) {
    try {
      suggestions = JSON.parse(match[1].trim())
      message = text.replace(/<suggestions>[\s\S]*?<\/suggestions>/, '').trim()
    } catch { /* leave suggestions null */ }
  }

  return NextResponse.json({ message, suggestions })
}
