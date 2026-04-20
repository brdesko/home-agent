import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic()

const PROPERTY_ID = 'a1b2c3d4-0000-0000-0000-000000000001'

const SYSTEM_PROMPT = `You are the Property Agent for 5090 Durham Rd, Pipersville PA — a 5.3-acre property managed by Brady and Erin.

Your role is to help them manage their Property Notebook. Right now, you have one capability: adding new projects to the Notebook.

A project has these fields:
- name: a short, clear title
- domain: one of 'farm', 'renovation', 'grounds', 'maintenance', 'home-systems', or a new domain if none of those fit
- status: 'planned' (default for new projects), 'active', or 'on_hold'
- priority: 'low', 'medium', or 'high'
- description: a clear paragraph describing the project's scope and purpose

When someone asks you to add a project:
1. Ask clarifying questions to fill in the fields well. Keep it conversational — one or two questions at a time, not a form.
2. Once you have enough to make a good proposal, describe what you're about to create and ask for explicit confirmation before committing anything.
3. Only call create_project after the user has clearly approved (e.g. "yes", "go ahead", "looks good").

Be direct, warm, and honest. This is a personal tool — you know the property and you're helping people who care about it. Don't be bureaucratic or overly cautious, but don't commit anything without a clear green light.

You cannot modify existing projects, tasks, or budget lines in this phase. If asked, say so honestly and note that it's coming soon.`

const tools: Anthropic.Tool[] = [
  {
    name: 'create_project',
    description: 'Creates a new project in the Property Notebook. Only call this after the user has explicitly approved the proposal.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name:        { type: 'string', description: 'Project name' },
        domain:      { type: 'string', description: "Domain: 'farm', 'renovation', 'grounds', 'maintenance', 'home-systems', or a new domain" },
        status:      { type: 'string', enum: ['planned', 'active', 'on_hold'], description: "Project status — use 'planned' for new projects unless told otherwise" },
        priority:    { type: 'string', enum: ['low', 'medium', 'high'] },
        description: { type: 'string', description: 'Clear description of project scope and purpose' },
      },
      required: ['name', 'domain', 'status', 'priority'],
    },
  },
]

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { messages } = await req.json()

  let projectCreated: { id: string; name: string } | null = null
  let currentMessages: Anthropic.MessageParam[] = messages.map((m: { role: string; content: string }) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  // Agent loop — continues until Claude produces a final text response (cap at 10 iterations)
  for (let i = 0; i < 10; i++) {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: currentMessages,
      tools,
    })

    if (response.stop_reason === 'end_turn') {
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('')
      return NextResponse.json({ response: text, projectCreated })
    }

    if (response.stop_reason !== 'tool_use') break

    if (response.stop_reason === 'tool_use') {
      const toolResults: Anthropic.ToolResultBlockParam[] = []

      for (const block of response.content) {
        if (block.type !== 'tool_use') continue

        if (block.name === 'create_project') {
          const input = block.input as {
            name: string
            domain: string
            status: string
            priority: string
            description?: string
          }

          const { data, error } = await supabase
            .from('projects')
            .insert({
              property_id: PROPERTY_ID,
              name:        input.name,
              domain:      input.domain,
              status:      input.status,
              priority:    input.priority,
              description: input.description ?? null,
            })
            .select('id, name')
            .single()

          if (error) {
            toolResults.push({
              type:        'tool_result',
              tool_use_id: block.id,
              content:     `Error creating project: ${error.message}`,
              is_error:    true,
            })
          } else {
            projectCreated = data
            toolResults.push({
              type:        'tool_result',
              tool_use_id: block.id,
              content:     JSON.stringify({ success: true, id: data.id, name: data.name }),
            })
          }
        }
      }

      currentMessages = [
        ...currentMessages,
        { role: 'assistant', content: response.content },
        { role: 'user',      content: toolResults },
      ]
    }
  }
}
