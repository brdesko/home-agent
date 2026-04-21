import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getPropertyId } from '@/lib/get-property-id'

const anthropic = new Anthropic()

type ReferenceRow = { type: string; name: string; notes: string | null }
type PropertyInfo = { name: string; address: string | null }

const ZILLOW_REDFIN = /zillow\.com|redfin\.com/i

const LISTING_PARSE_PROMPT = `You are a property intelligence assistant. Extract structured information from the provided listing or document.

Return ONLY valid JSON with no markdown, matching this exact structure:
{
  "summary": "One sentence describing this property",
  "propertyDetails": {
    "year_built": 1985,
    "sq_footage": 2400,
    "lot_size": "5.3 acres",
    "acreage": 5.3,
    "heat_type": "oil",
    "well_septic": "Private well, 4-bedroom septic installed 2008",
    "details_notes": "Other notable facts"
  },
  "assets": [
    { "name": "Carrier Gas Furnace", "asset_type": "hvac", "make": "Carrier", "model": "58CVA080", "install_date": "2015", "location": "Basement", "notes": "Good condition" }
  ],
  "suggestedProjects": [
    {
      "name": "Replace aging water heater",
      "domain": "maintenance",
      "description": "Water heater is 18 years old and showing corrosion.",
      "priority": "high",
      "tasks": ["Get quotes from 3 plumbers", "Choose tank vs tankless", "Schedule installation"]
    }
  ]
}

Use null for any propertyDetails fields not found. Include only assets and projects actually evidenced in the source. Asset types: hvac, water-heater, roof, well-pump, septic, electrical, plumbing, appliance, vehicle, equipment, structure, other. Project domains: renovation, farm, grounds, maintenance, home-systems. Project priorities: high, medium, low.`

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60000)
}

function extractListingJson(raw: string): unknown {
  const cleaned = raw.trim()
  try { return JSON.parse(cleaned) } catch {}
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenced) try { return JSON.parse(fenced[1].trim()) } catch {}
  const braceStart = cleaned.indexOf('{')
  const braceEnd   = cleaned.lastIndexOf('}')
  if (braceStart !== -1 && braceEnd > braceStart) {
    try { return JSON.parse(cleaned.slice(braceStart, braceEnd + 1)) } catch {}
  }
  return null
}

function buildSystemPrompt(
  property: PropertyInfo,
  projects: { id: string; name: string; domain: string; status: string; priority: string; goal_id: string | null }[],
  goals: { id: string; name: string; status: string; target_budget: number | null; sort_order: number }[],
  references: ReferenceRow[]
) {
  const isEmpty = projects.length === 0 && goals.length === 0
  const sortedGoals = [...goals].sort((a, b) => a.sort_order - b.sort_order)
  const goalList = sortedGoals.length > 0
    ? sortedGoals.map((g, i) => {
        const budget = g.target_budget ? `, target budget: $${g.target_budget.toLocaleString()}` : ''
        return `- #${i + 1} ${g.name} (id: ${g.id}, status: ${g.status}${budget})`
      }).join('\n')
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

  const propertyLine = property.address
    ? `${property.name} (${property.address})`
    : property.name

  const onboardingSection = isEmpty ? `
This is a brand new property notebook — no projects or goals exist yet. Your first job is to help the owner set it up. Be warm and practical.

Start by saying something like: "Welcome — let's get your notebook set up. Do you have a Zillow or Redfin listing URL for this property, or any other listing or inspection report? If so, paste the URL or the listing text here and I'll pull out the details automatically. Otherwise, just tell me what you own and what's on your mind."

When the owner shares a URL:
- Call parse_listing with source: "url" and the URL immediately — do not ask for manual details first.
- If it's a Zillow or Redfin URL the tool will return instructions on how to get pasted text. Follow those instructions exactly: tell the user to open the listing, press Ctrl+A, Ctrl+C, then paste into this chat.

When the owner pastes listing text:
- Call parse_listing with source: "text" immediately.
- After a successful parse, without asking for approval: call update_property_details with the propertyDetails fields (skip null fields), then call create_asset for each asset.
- Then summarize what you saved, and propose the suggestedProjects for explicit approval before creating them.
- After projects are approved and created, ask what their top goals for the property are this year.

When the owner describes goals or projects verbally instead:
- Help them name 1–3 top goals for the property this year.
- Propose a first project package (name, domain, tasks, rough budget) and wait for approval.
` : ''

  return `You are the Property Agent for ${propertyLine}.
${onboardingSection}
Current goals:
${goalList}

Active and planned projects:
${activeList}

Completed projects (history):
${completedList}

Saved references:
${referencesSection}

Use project and goal IDs when calling tools. Reference the relevant goal when proposing or modifying projects.

A goal has: name, description, status ('active', 'complete', 'paused'), priority, target_budget (the total budget target for achieving the goal across all linked projects), and sort_order (the explicit priority hierarchy — #1 is highest priority). Goals are listed above in rank order. Use update_goal to set or change the target_budget when the user mentions a spending target for a goal. When projects are being added or effort is being allocated, flag if lower-ranked goals are receiving disproportionate attention relative to higher-ranked ones.

A project has: name, domain ('farm', 'renovation', 'grounds', 'maintenance', 'home-systems', or new), status ('planned', 'active', 'on_hold', 'complete', 'cancelled' — use cancelled when a project is abandoned; it is excluded from all spend and effort metrics), priority ('low', 'medium', 'high'), effort ('low', 'medium', 'high', 'very_high' — reflects owner time/energy required, not cost; hired-out work is low effort even if expensive), target_year and target_quarter (when the project is planned to happen), description, target_budget (owner's intended spend ceiling for this project), actual_spend (total recorded actual spend — set when the user reports what they spent), and parent_project_id (links this project to a predecessor; the parent's target_budget is displayed as the inherited estimated spend for this project).

Project relationships: when a design, planning, or scoping project feeds directly into an execution project (e.g. Kitchen Design → Kitchen Renovation), set parent_project_id on the execution project to the design project's ID. When you create the execution project, also create an estimated budget line equal to the parent's target_budget so financial planning is consistent. If the user mentions a budget established during a prior phase, suggest linking the projects and carrying that budget forward.

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

When managing budget lines: use get_project_budget_lines to see what exists before adding or removing. Use add_budget_line to record estimated costs or actual spend. Use remove_budget_line when reallocating lines between projects (e.g., when splitting a project into two — move the relevant lines rather than duplicating them).

When effort or cost estimates are not provided, suggest reasonable placeholders based on the domain, description, and any saved references. Label them clearly as placeholders (e.g., "Placeholder estimate based on typical renovation projects — confirm when you have quotes"). Always propose these for explicit approval rather than silently defaulting.

When the user shares a listing URL or pastes listing/inspection text: call parse_listing immediately. Do not ask them to extract details manually when you can parse them. For Zillow/Redfin URLs the tool will give you exact instructions to relay to the user. After a successful parse, immediately call update_property_details and create_asset for each asset found (no approval needed for factual records). Then propose any suggestedProjects for approval.

When the user mentions buying something for the property — materials, tools, plants, services, anything — offer to log it as a purchase. Keep the offer brief: one sentence, then confirm before calling log_purchase. Capture: what was bought, vendor, price, date if mentioned, and which project it relates to if obvious. Use get_purchases when you need context about past buying patterns — what things cost, which vendors they use, what they tend to DIY vs. hire. Reference this history when making estimates or vendor suggestions.

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
  estimated_amount?: number
  actual_amount?: number
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
  goal_id?: string
  target_budget?: number
  parent_project_id?: string
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
  actual_spend?: number
  target_budget?: number
  parent_project_id?: string
}

type CreateGoalInput = {
  name: string
  description?: string
  priority?: string
  target_budget?: number
}

type UpdateGoalInput = {
  goal_id: string
  name?: string
  description?: string
  status?: string
  priority?: string
  target_budget?: number
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

type GetProjectBudgetLinesInput = { project_id: string }
type AddBudgetLineInput = { project_id: string; description: string; estimated_amount?: number; actual_amount?: number }
type RemoveBudgetLineInput = { budget_line_id: string }

type SaveReferenceInput = {
  type: 'vendor' | 'brand' | 'resource'
  name: string
  notes?: string
  url?: string
}

type LogPurchaseInput = {
  item_name: string
  vendor?: string
  price?: number
  purchased_at?: string
  project_id?: string
  category?: string
  notes?: string
}

type ParseListingInput = {
  source: 'url' | 'text'
  url?: string
  text?: string
}

type UpdatePropertyDetailsInput = {
  name?: string
  address?: string
  year_built?: number | null
  sq_footage?: number | null
  acreage?: number | null
  lot_size?: string | null
  heat_type?: string | null
  well_septic?: string | null
  details_notes?: string | null
}

type CreateAssetInput = {
  name: string
  asset_type: string
  make?: string
  model?: string
  install_date?: string
  location?: string
  notes?: string
}

type ProjectCreated = {
  id: string
  name: string
  taskCount: number
  budgetTotal: number
  eventCount: number
}

type ChangeResult = {
  type: 'project_created' | 'project_updated' | 'task_updated' | 'task_added' | 'budget_updated' | 'reference_saved' | 'purchase_logged'
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
        target_year:        { type: 'number', description: 'Year this project is planned for' },
        target_quarter:     { type: 'number', enum: [1, 2, 3, 4], description: 'Quarter this project is planned for' },
        description:        { type: 'string' },
        goal_id:            { type: 'string', description: 'Assign to a goal by ID' },
        target_budget:      { type: 'number', description: 'Owner\'s intended spend ceiling for this project' },
        parent_project_id:  { type: 'string', description: 'ID of a predecessor project whose target_budget becomes this project\'s inherited estimated spend' },
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
              description:      { type: 'string' },
              estimated_amount: { type: 'number', description: 'Planned cost for this item' },
              actual_amount:    { type: 'number', description: 'Actual recorded cost for this item' },
            },
            required: ['description'],
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
        status:         { type: 'string', enum: ['planned', 'active', 'on_hold', 'complete', 'cancelled'] },
        priority:       { type: 'string', enum: ['low', 'medium', 'high'] },
        effort:         { type: 'string', enum: ['low', 'medium', 'high', 'very_high'], description: 'Owner effort level' },
        target_year:    { type: 'number', description: 'Year this project is planned for' },
        target_quarter: { type: 'number', enum: [1, 2, 3, 4], description: 'Quarter this project is planned for' },
        description:    { type: 'string' },
        goal_id:           { type: 'string', description: 'Assign to a goal by ID, or omit to leave unchanged' },
        actual_spend:      { type: 'number', description: 'Recorded actual spend for this project (total, not a line item)' },
        target_budget:     { type: 'number', description: 'Owner\'s intended spend ceiling for this project' },
        parent_project_id: { type: 'string', description: 'ID of a predecessor project whose target_budget becomes this project\'s inherited estimated spend' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'create_goal',
    description: 'Creates a new goal for this property. Only call after explicit user approval.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name:          { type: 'string' },
        description:   { type: 'string' },
        priority:      { type: 'string', enum: ['low', 'medium', 'high'] },
        target_budget: { type: 'number', description: 'Total budget target for this goal' },
      },
      required: ['name'],
    },
  },
  {
    name: 'update_goal',
    description: 'Updates fields on an existing goal, including its target budget. Only call after explicit user approval.',
    input_schema: {
      type: 'object' as const,
      properties: {
        goal_id:       { type: 'string' },
        name:          { type: 'string' },
        description:   { type: 'string' },
        status:        { type: 'string', enum: ['active', 'complete', 'paused'] },
        priority:      { type: 'string', enum: ['low', 'medium', 'high'] },
        target_budget: { type: 'number', description: 'Total budget target for this goal across all linked projects' },
      },
      required: ['goal_id'],
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
    name: 'get_project_budget_lines',
    description: 'Returns current budget lines for a project. Call before adding or removing lines so you know what exists.',
    input_schema: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'add_budget_line',
    description: 'Adds a budget line item to a project. Each line has a description plus optional estimated and/or actual amounts. Only call after explicit user approval.',
    input_schema: {
      type: 'object' as const,
      properties: {
        project_id:       { type: 'string' },
        description:      { type: 'string', description: 'Name of this cost item (e.g. "Lumber", "Contractor labor")' },
        estimated_amount: { type: 'number', description: 'Planned/budgeted cost for this item' },
        actual_amount:    { type: 'number', description: 'Recorded actual cost for this item' },
      },
      required: ['project_id', 'description'],
    },
  },
  {
    name: 'remove_budget_line',
    description: 'Removes a budget line by ID. Call get_project_budget_lines first to get IDs. Only call after explicit user approval.',
    input_schema: {
      type: 'object' as const,
      properties: {
        budget_line_id: { type: 'string' },
      },
      required: ['budget_line_id'],
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
    name: 'log_purchase',
    description: 'Logs a purchase to the property purchase history. Use when the user mentions buying something for the property. Only call after explicit user approval.',
    input_schema: {
      type: 'object' as const,
      properties: {
        item_name:    { type: 'string', description: 'What was purchased' },
        vendor:       { type: 'string', description: 'Where it was purchased (store name, website, etc.)' },
        price:        { type: 'number', description: 'Total price paid in USD' },
        purchased_at: { type: 'string', description: 'Date purchased, ISO format YYYY-MM-DD. Default to today if not specified.' },
        project_id:   { type: 'string', description: 'ID of the project this purchase is for, if known' },
        category:     { type: 'string', description: 'Category such as Materials, Lumber, Hardware, Tools & Equipment, Plants & Seeds, Labor, etc.' },
        notes:        { type: 'string', description: 'Quantity, specs, or any other relevant context' },
      },
      required: ['item_name'],
    },
  },
  {
    name: 'get_purchases',
    description: 'Returns purchase history for this property, optionally filtered. Use when you need context about past buying patterns — pricing, preferred vendors, or category spend.',
    input_schema: {
      type: 'object' as const,
      properties: {
        category:   { type: 'string', description: 'Filter by category' },
        vendor:     { type: 'string', description: 'Filter by vendor name (partial match)' },
        project_id: { type: 'string', description: 'Filter by project ID' },
        limit:      { type: 'number', description: 'Max number of results to return (default 20)' },
      },
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
  {
    name: 'parse_listing',
    description: 'Parses a property listing from a URL or pasted text. Returns structured property details, assets, and project suggestions. Call immediately when the user shares listing content — do not ask for manual details when you can parse.',
    input_schema: {
      type: 'object' as const,
      properties: {
        source: { type: 'string', enum: ['url', 'text'], description: '"url" to fetch a webpage, "text" for content the user pasted into the chat' },
        url:    { type: 'string', description: 'URL to fetch and parse. Note: Zillow and Redfin block automated access — the tool will handle this.' },
        text:   { type: 'string', description: 'Raw text the user pasted (listing page, inspection report, etc.)' },
      },
      required: ['source'],
    },
  },
  {
    name: 'update_property_details',
    description: 'Saves physical details to the property profile (year built, square footage, acreage, heat type, etc.). Call after parse_listing returns propertyDetails, or when the user provides these facts directly. Does not require approval — these are factual records.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name:          { type: 'string', description: 'Property name' },
        address:       { type: 'string', description: 'Property address' },
        year_built:    { type: 'number', description: 'Year the main structure was built' },
        sq_footage:    { type: 'number', description: 'Interior square footage' },
        acreage:       { type: 'number', description: 'Total acreage' },
        lot_size:      { type: 'string', description: 'Lot size as descriptive text, e.g. "5.3 acres"' },
        heat_type:     { type: 'string', enum: ['oil', 'gas', 'propane', 'electric', 'heat pump', 'wood/pellet', 'other'] },
        well_septic:   { type: 'string', description: 'Description of water source and sewer system' },
        details_notes: { type: 'string', description: 'Other notable facts about the property' },
      },
      required: [],
    },
  },
  {
    name: 'create_asset',
    description: 'Saves a property asset (appliance, system, structure) to the property profile. Call for each asset returned by parse_listing, or when the user mentions a specific asset. Does not require approval — these are factual records.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name:         { type: 'string', description: 'Descriptive name, e.g. "Carrier Gas Furnace" or "Well Pump"' },
        asset_type:   { type: 'string', enum: ['hvac', 'water-heater', 'roof', 'well-pump', 'septic', 'electrical', 'plumbing', 'appliance', 'vehicle', 'equipment', 'structure', 'other'] },
        make:         { type: 'string', description: 'Manufacturer or brand' },
        model:        { type: 'string', description: 'Model number or name' },
        install_date: { type: 'string', description: 'Year or date installed, e.g. "2015" or "2015-06"' },
        location:     { type: 'string', description: 'Where on the property, e.g. "Basement", "Detached garage"' },
        notes:        { type: 'string', description: 'Condition, service history, or other relevant notes' },
      },
      required: ['name', 'asset_type'],
    },
  },
]

export async function POST(req: NextRequest) {
  try {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const PROPERTY_ID = await getPropertyId(supabase, user.id)
  if (!PROPERTY_ID) return NextResponse.json({ error: 'No property found' }, { status: 404 })

  const { messages } = await req.json()

  // Inject current project, goal, and reference list into system prompt
  const [{ data: projectData }, { data: goalData }, { data: refData }, { data: propData }] = await Promise.all([
    supabase.from('projects').select('id, name, domain, status, priority, goal_id').eq('property_id', PROPERTY_ID).order('name'),
    supabase.from('goals').select('id, name, status, target_budget, sort_order').eq('property_id', PROPERTY_ID).order('sort_order').order('name'),
    supabase.from('saved_references').select('type, name, notes').eq('property_id', PROPERTY_ID).order('type').order('name'),
    supabase.from('properties').select('name, address').eq('id', PROPERTY_ID).single(),
  ])

  const projects   = projectData ?? []
  const goals      = goalData    ?? []
  const references = refData     ?? []
  const property: PropertyInfo = { name: propData?.name ?? 'this property', address: propData?.address ?? null }
  const systemPrompt = buildSystemPrompt(property, projects, goals, references)

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
          .insert({ property_id: PROPERTY_ID, name: input.name, domain: input.domain, status: input.status, priority: input.priority, effort: input.effort ?? null, target_year: input.target_year ?? null, target_quarter: input.target_quarter ?? null, description: input.description ?? null, goal_id: input.goal_id ?? null, target_budget: input.target_budget ?? null, parent_project_id: input.parent_project_id ?? null })
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
            input.budget_lines.map(b => ({ property_id: PROPERTY_ID, project_id: project.id, description: b.description, estimated_amount: b.estimated_amount ?? null, actual_amount: b.actual_amount ?? null }))
          )
          if (!error) budgetTotal = input.budget_lines.reduce((s, b) => s + (b.estimated_amount ?? 0), 0)
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

      // ── get_project_budget_lines ─────────────────────────────────────
      else if (block.name === 'get_project_budget_lines') {
        const { project_id } = block.input as GetProjectBudgetLinesInput
        const { data: lines, error } = await supabase
          .from('budget_lines')
          .select('id, description, estimated_amount, actual_amount')
          .eq('project_id', project_id)
          .order('created_at')
        if (error) {
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: `Error: ${error.message}`, is_error: true })
        } else {
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(lines) })
        }
      }

      // ── add_budget_line ───────────────────────────────────────────────
      else if (block.name === 'add_budget_line') {
        const input = block.input as AddBudgetLineInput
        const { data, error } = await supabase
          .from('budget_lines')
          .insert({ property_id: PROPERTY_ID, project_id: input.project_id, description: input.description, estimated_amount: input.estimated_amount ?? null, actual_amount: input.actual_amount ?? null })
          .select('id, description, estimated_amount, actual_amount')
          .single()
        if (error || !data) {
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: `Error: ${error?.message}`, is_error: true })
        } else {
          changes.push({ type: 'task_updated', summary: `Added budget line: ${data.description}` })
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify({ success: true, ...data }) })
        }
      }

      // ── remove_budget_line ────────────────────────────────────────────
      else if (block.name === 'remove_budget_line') {
        const { budget_line_id } = block.input as RemoveBudgetLineInput
        const { error } = await supabase
          .from('budget_lines')
          .delete()
          .eq('id', budget_line_id)
        if (error) {
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: `Error: ${error.message}`, is_error: true })
        } else {
          changes.push({ type: 'task_updated', summary: 'Removed budget line' })
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify({ success: true }) })
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
        if (fields.goal_id           !== undefined) updates.goal_id           = fields.goal_id
        if (fields.actual_spend      !== undefined) updates.actual_spend      = fields.actual_spend
        if (fields.target_budget     !== undefined) updates.target_budget     = fields.target_budget
        if (fields.parent_project_id !== undefined) updates.parent_project_id = fields.parent_project_id

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

      // ── create_goal ──────────────────────────────────────────────────
      else if (block.name === 'create_goal') {
        const input = block.input as CreateGoalInput

        const { count } = await supabase
          .from('goals')
          .select('*', { count: 'exact', head: true })
          .eq('property_id', PROPERTY_ID)

        const { data, error } = await supabase
          .from('goals')
          .insert({
            property_id:   PROPERTY_ID,
            name:          input.name,
            description:   input.description   ?? null,
            priority:      input.priority      ?? 'medium',
            target_budget: input.target_budget ?? null,
            status:        'active',
            sort_order:    (count ?? 0) + 1,
          })
          .select('id, name')
          .single()

        if (error || !data) {
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: `Error: ${error?.message}`, is_error: true })
        } else {
          changes.push({ type: 'project_updated', summary: `Created goal: ${data.name}` })
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify({ success: true, id: data.id, name: data.name }) })
        }
      }

      // ── update_goal ──────────────────────────────────────────────────
      else if (block.name === 'update_goal') {
        const { goal_id, ...fields } = block.input as UpdateGoalInput
        const updates: Record<string, unknown> = {}
        if (fields.name          !== undefined) updates.name          = fields.name
        if (fields.description   !== undefined) updates.description   = fields.description
        if (fields.status        !== undefined) updates.status        = fields.status
        if (fields.priority      !== undefined) updates.priority      = fields.priority
        if (fields.target_budget !== undefined) updates.target_budget = fields.target_budget

        const { data, error } = await supabase
          .from('goals')
          .update(updates)
          .eq('id', goal_id)
          .select('id, name')
          .single()

        if (error || !data) {
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: `Error: ${error?.message}`, is_error: true })
        } else {
          changes.push({ type: 'project_updated', summary: `Updated goal: ${data.name}` })
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

      // ── log_purchase ─────────────────────────────────────────────────
      else if (block.name === 'log_purchase') {
        const input = block.input as LogPurchaseInput
        const today = new Date().toISOString().split('T')[0]
        const { data, error } = await supabase
          .from('purchases')
          .insert({
            property_id:  PROPERTY_ID,
            item_name:    input.item_name,
            vendor:       input.vendor       ?? null,
            price:        input.price        ?? null,
            purchased_at: input.purchased_at ?? today,
            project_id:   input.project_id   ?? null,
            category:     input.category     ?? null,
            notes:        input.notes        ?? null,
          })
          .select('id, item_name, vendor, price, category')
          .single()

        if (error || !data) {
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: `Error: ${error?.message}`, is_error: true })
        } else {
          const summary = [data.vendor, data.category, data.price != null ? `$${data.price}` : null].filter(Boolean).join(' · ')
          changes.push({ type: 'purchase_logged', summary: `Logged purchase: ${data.item_name}${summary ? ` (${summary})` : ''}` })
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify({ success: true, ...data }) })
        }
      }

      // ── get_purchases ─────────────────────────────────────────────────
      else if (block.name === 'get_purchases') {
        const { category, vendor, project_id, limit } = block.input as { category?: string; vendor?: string; project_id?: string; limit?: number }
        let query = supabase
          .from('purchases')
          .select('id, item_name, vendor, price, purchased_at, category, project_id, notes')
          .eq('property_id', PROPERTY_ID)
          .order('purchased_at', { ascending: false })
          .limit(limit ?? 20)

        if (category)   query = query.eq('category', category)
        if (project_id) query = query.eq('project_id', project_id)
        if (vendor)     query = query.ilike('vendor', `%${vendor}%`)

        const { data: purchases, error } = await query
        if (error) {
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: `Error: ${error.message}`, is_error: true })
        } else {
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(purchases) })
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

      // ── parse_listing ────────────────────────────────────────────────
      else if (block.name === 'parse_listing') {
        const input = block.input as ParseListingInput
        try {
          let contentText = ''

          if (input.source === 'url' && input.url) {
            if (ZILLOW_REDFIN.test(input.url)) {
              toolResults.push({
                type: 'tool_result', tool_use_id: block.id,
                content: 'Zillow and Redfin block automated access. Ask the user to: open the listing in their browser, press Ctrl+A to select all, Ctrl+C to copy, then paste the text into this chat. Then call parse_listing again with source: "text".',
              })
              continue
            }
            const res = await fetch(input.url, {
              headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HomeAgent/1.0)' },
              signal: AbortSignal.timeout(15000),
            })
            const html = await res.text()
            contentText = stripHtml(html)
            if (contentText.length < 200) {
              toolResults.push({
                type: 'tool_result', tool_use_id: block.id,
                content: 'The page returned too little content to parse (likely blocked or JS-rendered). Ask the user to paste the listing text directly into the chat, then call parse_listing with source: "text".',
              })
              continue
            }
          } else if (input.source === 'text' && input.text) {
            contentText = input.text.slice(0, 60000)
          } else {
            toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: 'Error: provide url with source "url" or text with source "text"', is_error: true })
            continue
          }

          const parseMsg = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 4096,
            messages: [{ role: 'user', content: `Property listing content:\n\n${contentText}\n\n${LISTING_PARSE_PROMPT}` }],
          })
          const raw = parseMsg.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map(b => b.text).join('')
          const parsed = extractListingJson(raw)
          if (!parsed) {
            toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: 'Could not extract structured data from this content.', is_error: true })
          } else {
            toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(parsed) })
          }
        } catch (e) {
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: `Error parsing listing: ${String(e)}`, is_error: true })
        }
      }

      // ── update_property_details ──────────────────────────────────────
      else if (block.name === 'update_property_details') {
        const input = block.input as UpdatePropertyDetailsInput
        const updates: Record<string, unknown> = {}
        if (input.name          !== undefined) updates.name          = input.name
        if (input.address       !== undefined) updates.address       = input.address
        if (input.year_built    !== undefined) updates.year_built    = input.year_built
        if (input.sq_footage    !== undefined) updates.sq_footage    = input.sq_footage
        if (input.acreage       !== undefined) updates.acreage       = input.acreage
        if (input.lot_size      !== undefined) updates.lot_size      = input.lot_size
        if (input.heat_type     !== undefined) updates.heat_type     = input.heat_type
        if (input.well_septic   !== undefined) updates.well_septic   = input.well_septic
        if (input.details_notes !== undefined) updates.details_notes = input.details_notes

        const { error } = await supabase.from('properties').update(updates).eq('id', PROPERTY_ID)
        if (error) {
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: `Error: ${error.message}`, is_error: true })
        } else {
          changes.push({ type: 'project_updated', summary: 'Updated property details' })
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify({ success: true }) })
        }
      }

      // ── create_asset ─────────────────────────────────────────────────
      else if (block.name === 'create_asset') {
        const input = block.input as CreateAssetInput
        const { data, error } = await supabase
          .from('assets')
          .insert({
            property_id:  PROPERTY_ID,
            name:         input.name,
            asset_type:   input.asset_type,
            make:         input.make         ?? null,
            model:        input.model        ?? null,
            install_date: input.install_date ?? null,
            location:     input.location     ?? null,
            notes:        input.notes        ?? null,
          })
          .select('id, name, asset_type')
          .single()

        if (error || !data) {
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: `Error: ${error?.message}`, is_error: true })
        } else {
          changes.push({ type: 'project_updated', summary: `Added asset: ${data.name}` })
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify({ success: true, id: data.id, name: data.name, asset_type: data.asset_type }) })
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
  } catch (err) {
    console.error('[agent] unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error', response: 'Something went wrong on our end. Please try again.' }, { status: 500 })
  }
}
