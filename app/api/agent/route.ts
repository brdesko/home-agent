import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic()

const PROPERTY_ID = 'a1b2c3d4-0000-0000-0000-000000000001'

type ReferenceRow = { type: string; name: string; notes: string | null }

function buildSystemPrompt(
  projects: { id: string; name: string; domain: string; status: string; priority: string; goal_id: string | null }[],
  goals: { id: string; name: string; status: string }[],
  references: ReferenceRow[]
) {
  const goalList = goals.length > 0
    ? goals.map(g => `- ${g.name} (id: ${g.id}, status: ${g.status})`).join('\n')
    : '(no goals yet)'

  const active    = projects.filter(p => p.status !== 'complete')
  const completed = projects.filter(p => p.status === 'complete')

  const formatProject = (p: typeof projects[0]) => {
    const goal = goals.find(g => g.id === p.goal_id)
    const goalLabel = goal ? `, goal: ${goal.name}` : ''
    return `- ${p.name} (id: ${p.id}, domain: ${p.domain}, status: ${p.status}, priority: ${p.priority}${goalLabel})`
  }

  const activeList    = active.length    > 0 ? active.map(formatProject).join('\n')    : '(none)'
  const completedList = completed.length > 0 ? completed.map(formatProject).join('\n') : '(none yet)'

  const refsByType: Record<string, ReferenceRow[]> = {}
  for (const r of references) {
    refsByType[r.type] ??= []
    refsByType[r.type].push(r)
  }
  const refList = Object.entries(refsByType)
    .map(([type, items]) => `${type}s: ${items.map(r => r.name + (r.notes ? ` (${r.notes})` : '')).join(', ')}`)
    .join('\n')
  const referencesSection = refList || '(none saved yet)'

  return `You are the Property Agent for 5090 Durham Rd, Pipersville PA — a 5.3-acre property managed by Brady and Erin.

Your role is to help them manage their Property Notebook. You can add new projects, modify existing ones — updating details, tasks, or status — and save trusted vendors, brands, and resources to their References list.

Current goals:
${goalList}

Active and planned projects:
${activeList}

Completed projects (history):
${completedList}

Saved references:
${referencesSection}

Use project and goal IDs when calling tools. Reference the relevant goal when proposing or modifying projects.

A project has: name, domain ('farm', 'renovation', 'grounds', 'maintenance', 'home-systems', or new), status ('planned', 'active', 'on_hold', 'complete'), priority ('low', 'medium', 'high'), effort ('low', 'medium', 'high', 'very_high' — reflects owner time/energy required, not cost; hired-out work is low effort even if expensive), target_year and target_quarter (when the project is planned to happen), and description.

A task has: title, status ('todo', 'in_progress', 'done', 'blocked'), and optional due_date (YYYY-MM-DD).

Pattern awareness: use the completed projects and saved references to inform suggestions. If Brady and Erin have consistently hired out a certain type of work (evidenced by saved vendors), reflect that when proposing tasks. If they have a trusted vendor for a relevant trade, mention them by name rather than suggesting they find someone. Notice which domains they prioritize and which they defer — let that shape your recommendations.

When adding a new project:
1. Ask focused clarifying questions — priority, scope, known budget, key dates, and which quarter they expect to tackle it.
2. Estimate the effort level: low = mostly hired out (kitchen renovation with contractors), medium = some DIY coordination, high = significant hands-on work, very_high = intensive DIY (building a fence, prepping fields). Ask if not obvious.
3. If a trusted vendor is relevant to this project, mention them in the proposal.
4. Propose a complete package (project + initial tasks + budget lines if relevant + timeline events), including effort and target quarter.
5. Wait for explicit approval before calling create_project.

When modifying an existing project or task:
1. Confirm you understand which project or task they mean.
2. If you need to see the current tasks, call get_project_tasks first.
3. Describe the change you're about to make and wait for a clear go-ahead.
4. Call the appropriate update tool only after approval.

When a message begins with task completion context ("I just completed..."):
1. Immediately call get_all_tasks — no need to ask first, it's read-only.
2. Review all projects. Think about what the outcome implies beyond the originating project. Are tasks in other projects now unblocked? Should anything be reprioritized? Is a new project warranted?
3. If a trusted vendor is relevant to next steps, mention them by name.
4. Propose a specific, concrete set of changes. Wait for explicit approval before calling any update or create tools.
5. Keep it tight — two or three well-reasoned suggestions beats a laundry list.

When a contractor, service provider, brand, or resource comes up positively in conversation — offer to save it to References. Keep the offer brief. If yes, call save_reference with useful context in the notes field.

Be direct, warm, and honest. Use good judgment — don't ask unnecessary questions. Never commit anything without a clear green light.

Write in plain prose. No markdown — no asterisks, no dashes for bullet lists, no pound-sign headers. Use short paragraphs and line breaks for structure.`
}

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
  effort?: string
  target_year?: number
  target_quarter?: number
  description?: string
  tasks?: TaskInput[]
  budget_lines?: BudgetLineInput[]
  timeline_events?: TimelineEventInput[]
}

type UpdateProjectInput = {
  project_id: string
  name?: string
  domain?: string
  status?: string
  priority?: string
  effort?: string
  target_year?: number
  target_quarter?: number
  description?: string
  goal_id?: string
}

type UpdateTaskInput = {
  task_id: string
  title?: string
  status?: string
  due_date?: string | null
}

type AddTaskInput = {
  project_id: string
  title: string
  status?: string
  due_date?: string
}

type SetQuarterlyBudgetInput = {
  year: number
  quarter: number
  core_income?: number
  additional_income?: number
  core_expenses?: number
  additional_expenses?: number
  allocation_pct?: number
}

type SaveReferenceInput = {
  type: 'vendor' | 'brand' | 'resource'
  name: string
  notes?: string
  url?: string
}

type ProjectCreated = {
  id: string
  name: string
  taskCount: number
  budgetTotal: number
  eventCount: number
}

type ChangeResult = {
  type: 'project_created' | 'project_updated' | 'task_updated' | 'task_added' | 'budget_updated' | 'reference_saved'
  summary: string
}

const tools: Anthropic.Tool[] = [
  {
    name: 'create_project',
    description: 'Creates a new project with optional initial tasks, budget lines, and timeline events. Only call after explicit user approval.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name:           { type: 'string' },
        domain:         { type: 'string' },
        status:         { type: 'string', enum: ['planned', 'active', 'on_hold'] },
        priority:       { type: 'string', enum: ['low', 'medium', 'high'] },
        effort:         { type: 'string', enum: ['low', 'medium', 'high', 'very_high'], description: 'Owner effort level: low = mostly hired out, very_high = intensive DIY' },
        target_year:    { type: 'number', description: 'Year this project is planned for' },
        target_quarter: { type: 'number', enum: [1, 2, 3, 4], description: 'Quarter this project is planned for' },
        description: { type: 'string' },
        tasks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title:    { type: 'string' },
              status:   { type: 'string', enum: ['todo', 'in_progress', 'blocked'] },
              due_date: { type: 'string' },
            },
            required: ['title'],
          },
        },
        budget_lines: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              amount:      { type: 'number' },
              line_type:   { type: 'string', enum: ['estimated', 'actual'] },
              category:    { type: 'string' },
            },
            required: ['description', 'amount'],
          },
        },
        timeline_events: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title:       { type: 'string' },
              description: { type: 'string' },
              event_date:  { type: 'string' },
            },
            required: ['title', 'event_date'],
          },
        },
      },
      required: ['name', 'domain', 'status', 'priority'],
    },
  },
  {
    name: 'get_project_tasks',
    description: 'Returns the current tasks for a project. Call this before updating tasks so you know the task IDs.',
    input_schema: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string', description: 'The project ID' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'update_project',
    description: 'Updates fields on an existing project. Only call after explicit user approval.',
    input_schema: {
      type: 'object' as const,
      properties: {
        project_id:     { type: 'string' },
        name:           { type: 'string' },
        domain:         { type: 'string' },
        status:         { type: 'string', enum: ['planned', 'active', 'on_hold', 'complete'] },
        priority:       { type: 'string', enum: ['low', 'medium', 'high'] },
        effort:         { type: 'string', enum: ['low', 'medium', 'high', 'very_high'], description: 'Owner effort level' },
        target_year:    { type: 'number', description: 'Year this project is planned for' },
        target_quarter: { type: 'number', enum: [1, 2, 3, 4], description: 'Quarter this project is planned for' },
        description:    { type: 'string' },
        goal_id:        { type: 'string', description: 'Assign to a goal by ID, or omit to leave unchanged' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'update_task',
    description: 'Updates fields on an existing task. Call get_project_tasks first to get task IDs. Only call after explicit user approval.',
    input_schema: {
      type: 'object' as const,
      properties: {
        task_id:  { type: 'string' },
        title:    { type: 'string' },
        status:   { type: 'string', enum: ['todo', 'in_progress', 'done', 'blocked'] },
        due_date: { type: 'string', description: 'ISO date YYYY-MM-DD, or null to clear' },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'set_quarterly_budget',
    description: 'Sets one or more fields on a quarterly budget entry. Creates the quarter if it does not exist. Only call after explicit user approval.',
    input_schema: {
      type: 'object' as const,
      properties: {
        year:               { type: 'number', description: 'e.g. 2026' },
        quarter:            { type: 'number', enum: [1, 2, 3, 4] },
        core_income:        { type: 'number', description: 'Post-tax salary and bonus aggregate' },
        additional_income:  { type: 'number', description: 'Investment accounts, side income, etc.' },
        core_expenses:      { type: 'number', description: 'Fixed recurring expenses (utilities, internet, etc.)' },
        additional_expenses:{ type: 'number', description: 'Variable expenses (food, entertainment, travel, etc.)' },
        allocation_pct:     { type: 'number', description: 'Percentage of net income allocated to home improvement (0-100)' },
      },
      required: ['year', 'quarter'],
    },
  },
  {
    name: 'get_saved_references',
    description: 'Returns all saved references (vendors, brands, resources) for this property. Use when you need the full list with details mid-conversation.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'save_reference',
    description: 'Saves a trusted vendor, preferred brand, or useful resource to the property references list. Only call after explicit user approval.',
    input_schema: {
      type: 'object' as const,
      properties: {
        type:  { type: 'string', enum: ['vendor', 'brand', 'resource'], description: 'vendor = contractor/service provider, brand = product brand, resource = link/guide/tool' },
        name:  { type: 'string', description: 'Name of the vendor, brand, or resource' },
        notes: { type: 'string', description: 'Why they are trusted, what they were used for, any contact info or details' },
        url:   { type: 'string', description: 'Website or contact URL, optional' },
      },
      required: ['type', 'name'],
    },
  },
  {
    name: 'get_all_tasks',
    description: 'Returns all tasks across every project for this property, grouped by project_id. Use this for a full Notebook assessment — e.g., after a task completion to find cascade implications across all projects.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'add_task',
    description: 'Adds a new task to an existing project. Only call after explicit user approval.',
    input_schema: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string' },
        title:      { type: 'string' },
        status:     { type: 'string', enum: ['todo', 'in_progress', 'blocked'] },
        due_date:   { type: 'string', description: 'ISO date YYYY-MM-DD, optional' },
      },
      required: ['project_id', 'title'],
    },
  },
]

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { messages } = await req.json()

  // Inject current project, goal, and reference list into system prompt
  const [{ data: projectData }, { data: goalData }, { data: refData }] = await Promise.all([
    supabase.from('projects').select('id, name, domain, status, priority, goal_id').eq('property_id', PROPERTY_ID).order('name'),
    supabase.from('goals').select('id, name, status').eq('property_id', PROPERTY_ID).order('name'),
    supabase.from('saved_references').select('type, name, notes').eq('property_id', PROPERTY_ID).order('type').order('name'),
  ])

  const projects   = projectData ?? []
  const goals      = goalData    ?? []
  const references = refData     ?? []
  const systemPrompt = buildSystemPrompt(projects, goals, references)

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

      // ── create_project ──────────────────────────────────────────────
      if (block.name === 'create_project') {
        const input = block.input as CreateProjectInput

        const { data: project, error: projectError } = await supabase
          .from('projects')
          .insert({ property_id: PROPERTY_ID, name: input.name, domain: input.domain, status: input.status, priority: input.priority, effort: input.effort ?? null, target_year: input.target_year ?? null, target_quarter: input.target_quarter ?? null, description: input.description ?? null })
          .select('id, name')
          .single()

        if (projectError || !project) {
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: `Error: ${projectError?.message}`, is_error: true })
          continue
        }

        let taskCount = 0, budgetTotal = 0, eventCount = 0

        if (input.tasks?.length) {
          const { error } = await supabase.from('tasks').insert(
            input.tasks.map(t => ({ property_id: PROPERTY_ID, project_id: project.id, title: t.title, status: t.status ?? 'todo', due_date: t.due_date ?? null }))
          )
          if (!error) taskCount = input.tasks.length
        }
        if (input.budget_lines?.length) {
          const { error } = await supabase.from('budget_lines').insert(
            input.budget_lines.map(b => ({ property_id: PROPERTY_ID, project_id: project.id, description: b.description, amount: b.amount, line_type: b.line_type ?? 'estimated', category: b.category ?? null }))
          )
          if (!error) budgetTotal = input.budget_lines.reduce((s, b) => s + b.amount, 0)
        }
        if (input.timeline_events?.length) {
          const { error } = await supabase.from('timeline_events').insert(
            input.timeline_events.map(e => ({ property_id: PROPERTY_ID, project_id: project.id, title: e.title, description: e.description ?? null, event_date: e.event_date }))
          )
          if (!error) eventCount = input.timeline_events.length
        }

        projectCreated = { id: project.id, name: project.name, taskCount, budgetTotal, eventCount }
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify({ success: true, ...projectCreated }) })
      }

      // ── get_project_tasks ────────────────────────────────────────────
      else if (block.name === 'get_project_tasks') {
        const { project_id } = block.input as { project_id: string }
        const { data: tasks, error } = await supabase
          .from('tasks')
          .select('id, title, status, due_date')
          .eq('project_id', project_id)
          .order('created_at')

        if (error) {
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: `Error: ${error.message}`, is_error: true })
        } else {
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(tasks) })
        }
      }

      // ── set_quarterly_budget ─────────────────────────────────────────
      else if (block.name === 'set_quarterly_budget') {
        const { year, quarter, ...fields } = block.input as SetQuarterlyBudgetInput
        const { data, error } = await supabase
          .from('quarterly_budget')
          .upsert(
            { property_id: PROPERTY_ID, year, quarter, ...fields },
            { onConflict: 'property_id,year,quarter' }
          )
          .select()
          .single()

        if (error || !data) {
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: `Error: ${error?.message}`, is_error: true })
        } else {
          changes.push({ type: 'budget_updated', summary: `Updated Q${quarter} ${year} budget` })
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify({ success: true, year, quarter }) })
        }
      }

      // ── save_reference ───────────────────────────────────────────────
      else if (block.name === 'save_reference') {
        const input = block.input as SaveReferenceInput
        const { data, error } = await supabase
          .from('saved_references')
          .insert({ property_id: PROPERTY_ID, type: input.type, name: input.name, notes: input.notes ?? null, url: input.url ?? null })
          .select('id, name, type')
          .single()

        if (error || !data) {
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: `Error: ${error?.message}`, is_error: true })
        } else {
          changes.push({ type: 'reference_saved', summary: `Saved ${data.type}: ${data.name}` })
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify({ success: true, id: data.id, name: data.name, type: data.type }) })
        }
      }

      // ── get_saved_references ─────────────────────────────────────────
      else if (block.name === 'get_saved_references') {
        const { data: refs, error } = await supabase
          .from('saved_references')
          .select('id, type, name, notes, url, created_at')
          .eq('property_id', PROPERTY_ID)
          .order('type')
          .order('name')

        if (error) {
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: `Error: ${error.message}`, is_error: true })
        } else {
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(refs) })
        }
      }

      // ── get_all_tasks ────────────────────────────────────────────────
      else if (block.name === 'get_all_tasks') {
        const { data: allTasks, error } = await supabase
          .from('tasks')
          .select('id, title, status, due_date, project_id')
          .eq('property_id', PROPERTY_ID)
          .order('project_id')
          .order('created_at')

        if (error) {
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: `Error: ${error.message}`, is_error: true })
        } else {
          const byProject: Record<string, typeof allTasks> = {}
          for (const task of allTasks ?? []) {
            byProject[task.project_id] ??= []
            byProject[task.project_id].push(task)
          }
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(byProject) })
        }
      }

      // ── update_project ───────────────────────────────────────────────
      else if (block.name === 'update_project') {
        const { project_id, ...fields } = block.input as UpdateProjectInput
        const updates: Record<string, unknown> = {}
        if (fields.name           !== undefined) updates.name           = fields.name
        if (fields.domain         !== undefined) updates.domain         = fields.domain
        if (fields.status         !== undefined) updates.status         = fields.status
        if (fields.priority       !== undefined) updates.priority       = fields.priority
        if (fields.effort         !== undefined) updates.effort         = fields.effort
        if (fields.target_year    !== undefined) updates.target_year    = fields.target_year
        if (fields.target_quarter !== undefined) updates.target_quarter = fields.target_quarter
        if (fields.description    !== undefined) updates.description    = fields.description
        if (fields.goal_id        !== undefined) updates.goal_id        = fields.goal_id

        const { data, error } = await supabase
          .from('projects')
          .update(updates)
          .eq('id', project_id)
          .select('id, name')
          .single()

        if (error || !data) {
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: `Error: ${error?.message}`, is_error: true })
        } else {
          changes.push({ type: 'project_updated', summary: `Updated project: ${data.name}` })
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify({ success: true, id: data.id, name: data.name }) })
        }
      }

      // ── update_task ──────────────────────────────────────────────────
      else if (block.name === 'update_task') {
        const { task_id, ...fields } = block.input as UpdateTaskInput
        const updates: Record<string, unknown> = {}
        if (fields.title    !== undefined) updates.title    = fields.title
        if (fields.status   !== undefined) updates.status   = fields.status
        if (fields.due_date !== undefined) updates.due_date = fields.due_date

        const { data, error } = await supabase
          .from('tasks')
          .update(updates)
          .eq('id', task_id)
          .select('id, title')
          .single()

        if (error || !data) {
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: `Error: ${error?.message}`, is_error: true })
        } else {
          changes.push({ type: 'task_updated', summary: `Updated task: ${data.title}` })
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify({ success: true, id: data.id, title: data.title }) })
        }
      }

      // ── add_task ─────────────────────────────────────────────────────
      else if (block.name === 'add_task') {
        const input = block.input as AddTaskInput
        const { data, error } = await supabase
          .from('tasks')
          .insert({ property_id: PROPERTY_ID, project_id: input.project_id, title: input.title, status: input.status ?? 'todo', due_date: input.due_date ?? null })
          .select('id, title')
          .single()

        if (error || !data) {
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: `Error: ${error?.message}`, is_error: true })
        } else {
          changes.push({ type: 'task_added', summary: `Added task: ${data.title}` })
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify({ success: true, id: data.id, title: data.title }) })
        }
      }
    }

    currentMessages = [
      ...currentMessages,
      { role: 'assistant', content: response.content },
      { role: 'user',      content: toolResults },
    ]
  }

  return NextResponse.json({ response: 'Something went wrong. Please try again.', projectCreated: null, changes: [] })
}
