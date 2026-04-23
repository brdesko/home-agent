import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getPropertyId } from '@/lib/get-property-id'
import { logger } from '@/lib/logger'

const anthropic = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const propertyId = await getPropertyId(supabase, user.id)
    if (!propertyId) return NextResponse.json({ error: 'No property found' }, { status: 404 })

    const { signedUrl, projectContext, messages } = await req.json() as {
      signedUrl: string
      projectContext?: { name: string; description?: string; tasks?: string[] }
      messages?: { role: 'user' | 'assistant'; content: string }[]
    }

    if (!signedUrl) return NextResponse.json({ error: 'signedUrl required' }, { status: 400 })
    if (messages?.some(m => !['user', 'assistant'].includes(m.role)))
      return NextResponse.json({ error: 'Invalid message role' }, { status: 400 })

    const { data: propData } = await supabase
      .from('properties')
      .select('name, address')
      .eq('id', propertyId)
      .single()

    const propertyLabel = propData?.address ?? propData?.name ?? 'this property'

    let systemPrompt = `You are the Property Agent for ${propertyLabel}. Review this photo from the property. Describe what you observe that is relevant to home management — visible structures, materials, conditions, completed work, outdoor features, or potential issues. Then ask 1 or 2 focused follow-up questions if anything warrants clarification, such as whether a visible change should be logged as a completed project, whether something poses a maintenance risk, or whether a structure should be tracked as a new zone or asset. Be concise and practical. Write in plain prose. No markdown.`

    if (projectContext) {
      systemPrompt += `\n\nThis photo was uploaded in the context of the "${projectContext.name}" project.`
      if (projectContext.description) systemPrompt += ` Project description: ${projectContext.description}.`
      if (projectContext.tasks?.length) systemPrompt += ` Current tasks: ${projectContext.tasks.join('; ')}.`
      systemPrompt += ` Review the photo through the lens of this project. Note any implications for other projects or tasks as well.`
    }

    const firstUserContent: Anthropic.ContentBlockParam[] = [
      {
        type: 'image',
        source: { type: 'url', url: signedUrl },
      } as Anthropic.ImageBlockParam,
      { type: 'text', text: 'Please review this photo.' },
    ]

    const allMessages: Anthropic.MessageParam[] = [
      { role: 'user', content: firstUserContent },
      ...(messages ?? []).map(m => ({ role: m.role, content: m.content })),
    ]

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: systemPrompt,
      messages: allMessages,
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')

    return NextResponse.json({ response: text })
  } catch (err) {
    logger.error('photos:review:unhandled-error', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
