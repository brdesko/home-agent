import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic()

const PROPERTY_ID = 'a1b2c3d4-0000-0000-0000-000000000001'

const SYSTEM_PROMPT = `You are the Property Agent for 5090 Durham Rd, Pipersville PA — a 5.3-acre property managed by Brady and Erin.

Your role is to help them manage their Property Notebook. You can add new projects to the Notebook, including their initial tasks, estimated budget lines, and key timeline events.

A project has:
- name: a short, clear title
- domain: 'farm', 'renovation', 'grounds', 'maintenance', 'home-systems', or a new domain if none of those fit
- status: 'planned' (default for new projects), 'active', or 'on_hold'
- priority: 'low', 'medium', or 'high'
- description: a clear paragraph describing scope and purpose

Along with each project, you can also create:
- tasks: initial to-do items. Use your judgment to propose reasonable starting tasks based on the project type — don't ask the user to enumerate every task. A handful of good starting tasks is better than an exhaustive list.
- budget_lines: estimated costs broken down by category. Ask about budget if it's likely to be significant. Skip if the project is clearly exploratory or cost is unknown.
- timeline_events: key dates or milestones. Ask about any target dates or deadlines that matter.

When someone asks you to add a project:
1. Ask a few focused clarifying questions — priority, rough scope, any known budget or key dates. Keep it conversational, not a form. One or two questions at a time.
2. Once you have enough, draft a complete proposal: project details, initial tasks (your judgment), budget lines if applicable, and timeline events if there are meaningful dates.
3. Present the full proposal clearly — the user should be able to read it and say yes or make adjustments.
4. Only call create_project after explicit approval (e.g. "yes", "go ahead", "looks good").

Be direct, warm, and honest. This is a personal tool — use good judgment and don't ask unnecessary questions. But never commit without a clear green light.

You cannot modify existing projects, tasks, or budget lines yet. If asked, say so honestly and note it's coming soon.`

type TaskInput = {
  title: string
  status?: string
  due_date?: string
}

type BudgetLineInput = {
  description: string
  amount: number
  line_type?: string
  category?: string
}

type TimelineEventInput = {
  title: string
  description?: string
  event_date: string
}

type CreateProjectInput = {
  name: string
  domain: string
  status: string
  priority: string
  description?: string
  tasks?: TaskInput[]
  budget_lines?: BudgetLineInput[]
  timeline_events?: TimelineEventInput[]
}

type ProjectCreated = {
  id: string
  name: string
  taskCount: number
  budgetTotal: number
  eventCount: number
}

const tools: Anthropic.Tool[] = [
  {
    name: 'create_project',
    description: 'Creates a new project in the Property Notebook, with optional initial tasks, budget lines, and timeline events. Only call this after the user has explicitly approved the proposal.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name:        { type: 'string', description: 'Project name' },
        domain:      { type: 'string', description: "Domain: 'farm', 'renovation', 'grounds', 'maintenance', 'home-systems', or a new domain" },
        status:      { type: 'string', enum: ['planned', 'active', 'on_hold'], description: "Use 'planned' for new projects unless told otherwise" },
        priority:    { type: 'string', enum: ['low', 'medium', 'high'] },
        description: { type: 'string', description: 'Clear description of project scope and purpose' },
        tasks: {
          type: 'array',
          description: 'Initial tasks for the project. Use judgment — propose a good starting set, not an exhaustive list.',
          items: {
            type: 'object',
            properties: {
              title:    { type: 'string' },
              status:   { type: 'string', enum: ['todo', 'in_progress', 'blocked'] },
              due_date: { type: 'string', description: 'ISO date YYYY-MM-DD, optional' },
            },
            required: ['title'],
          },
        },
        budget_lines: {
          type: 'array',
          description: 'Estimated costs, broken down by category. Omit if costs are unknown or project is exploratory.',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              amount:      { type: 'number', description: 'Amount in USD' },
              line_type:   { type: 'string', enum: ['estimated', 'actual'], description: "Use 'estimated' for new projects" },
              category:    { type: 'string', description: 'e.g. construction, equipment, materials, labor' },
            },
            required: ['description', 'amount'],
          },
        },
        timeline_events: {
          type: 'array',
          description: 'Key dates or milestones for the project.',
          items: {
            type: 'object',
            properties: {
              title:       { type: 'string' },
              description: { type: 'string' },
              event_date:  { type: 'string', description: 'ISO date YYYY-MM-DD' },
            },
            required: ['title', 'event_date'],
          },
        },
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

  let projectCreated: ProjectCreated | null = null
  let currentMessages: Anthropic.MessageParam[] = messages.map((m: { role: string; content: string }) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  // Agent loop — continues until Claude produces a final text response (cap at 10 iterations)
  for (let i = 0; i < 10; i++) {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
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

    const toolResults: Anthropic.ToolResultBlockParam[] = []

    for (const block of response.content) {
      if (block.type !== 'tool_use') continue

      if (block.name === 'create_project') {
        const input = block.input as CreateProjectInput

        // Insert project
        const { data: project, error: projectError } = await supabase
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

        if (projectError || !project) {
          toolResults.push({
            type:        'tool_result',
            tool_use_id: block.id,
            content:     `Error creating project: ${projectError?.message}`,
            is_error:    true,
          })
          continue
        }

        let taskCount = 0
        let budgetTotal = 0
        let eventCount = 0

        // Insert tasks
        if (input.tasks && input.tasks.length > 0) {
          const taskRows = input.tasks.map(t => ({
            property_id: PROPERTY_ID,
            project_id:  project.id,
            title:       t.title,
            status:      t.status ?? 'todo',
            due_date:    t.due_date ?? null,
          }))
          const { error } = await supabase.from('tasks').insert(taskRows)
          if (!error) taskCount = taskRows.length
        }

        // Insert budget lines
        if (input.budget_lines && input.budget_lines.length > 0) {
          const budgetRows = input.budget_lines.map(b => ({
            property_id: PROPERTY_ID,
            project_id:  project.id,
            description: b.description,
            amount:      b.amount,
            line_type:   b.line_type ?? 'estimated',
            category:    b.category ?? null,
          }))
          const { error } = await supabase.from('budget_lines').insert(budgetRows)
          if (!error) budgetTotal = input.budget_lines.reduce((sum, b) => sum + b.amount, 0)
        }

        // Insert timeline events
        if (input.timeline_events && input.timeline_events.length > 0) {
          const eventRows = input.timeline_events.map(e => ({
            property_id: PROPERTY_ID,
            project_id:  project.id,
            title:       e.title,
            description: e.description ?? null,
            event_date:  e.event_date,
          }))
          const { error } = await supabase.from('timeline_events').insert(eventRows)
          if (!error) eventCount = eventRows.length
        }

        projectCreated = { id: project.id, name: project.name, taskCount, budgetTotal, eventCount }
        toolResults.push({
          type:        'tool_result',
          tool_use_id: block.id,
          content:     JSON.stringify({ success: true, ...projectCreated }),
        })
      }
    }

    currentMessages = [
      ...currentMessages,
      { role: 'assistant', content: response.content },
      { role: 'user',      content: toolResults },
    ]
  }

  return NextResponse.json({ response: 'Something went wrong. Please try again.', projectCreated: null })
}
