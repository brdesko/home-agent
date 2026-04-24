import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { fetchWithFirecrawl } from '@/lib/firecrawl'
import { LISTING_PARSE_PROMPT, ZILLOW_REDFIN, stripHtml, extractListingJson } from './parse-utils'
import type {
  CreateProjectInput, UpdateProjectInput, CreateGoalInput, UpdateGoalInput,
  UpdateTaskInput, AddTaskInput, SetQuarterlyBudgetInput,
  GetProjectBudgetLinesInput, AddBudgetLineInput, RemoveBudgetLineInput,
  SaveReferenceInput, LogPurchaseInput, ParseListingInput,
  UpdatePropertyDetailsInput, CreateAssetInput,
  ProjectCreated, ChangeResult,
} from './types'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

export type ToolContext = {
  supabase: SupabaseClient
  propertyId: string
  anthropic: Anthropic
  changes: ChangeResult[]
  onProjectCreated: (p: ProjectCreated) => void
}

export async function runTool(
  block: Anthropic.ToolUseBlock,
  ctx: ToolContext
): Promise<Anthropic.ToolResultBlockParam> {
  const { supabase, propertyId: PROPERTY_ID, anthropic, changes, onProjectCreated } = ctx
  const id = block.id

  // ── create_project ──────────────────────────────────────────────
  if (block.name === 'create_project') {
    const input = block.input as CreateProjectInput

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({ property_id: PROPERTY_ID, name: input.name, domain: input.domain, status: input.status, priority: input.priority, effort: input.effort ?? null, target_year: input.target_year ?? null, target_quarter: input.target_quarter ?? null, description: input.description ?? null, goal_id: input.goal_id ?? null, target_budget: input.target_budget ?? null, parent_project_id: input.parent_project_id ?? null })
      .select('id, name')
      .single()

    if (projectError || !project) {
      return { type: 'tool_result', tool_use_id: id, content: `Error: ${projectError?.message}`, is_error: true }
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

    const created: ProjectCreated = { id: project.id, name: project.name, taskCount, budgetTotal, eventCount }
    onProjectCreated(created)
    return { type: 'tool_result', tool_use_id: id, content: JSON.stringify({ success: true, ...created }) }
  }

  // ── get_project_tasks ────────────────────────────────────────────
  if (block.name === 'get_project_tasks') {
    const { project_id } = block.input as { project_id: string }
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('id, title, status, due_date')
      .eq('project_id', project_id)
      .order('created_at')

    if (error) return { type: 'tool_result', tool_use_id: id, content: `Error: ${error.message}`, is_error: true }
    return { type: 'tool_result', tool_use_id: id, content: JSON.stringify(tasks) }
  }

  // ── get_project_budget_lines ─────────────────────────────────────
  if (block.name === 'get_project_budget_lines') {
    const { project_id } = block.input as GetProjectBudgetLinesInput
    const { data: lines, error } = await supabase
      .from('budget_lines')
      .select('id, description, estimated_amount, actual_amount')
      .eq('project_id', project_id)
      .order('created_at')

    if (error) return { type: 'tool_result', tool_use_id: id, content: `Error: ${error.message}`, is_error: true }
    return { type: 'tool_result', tool_use_id: id, content: JSON.stringify(lines) }
  }

  // ── add_budget_line ───────────────────────────────────────────────
  if (block.name === 'add_budget_line') {
    const input = block.input as AddBudgetLineInput
    const { data, error } = await supabase
      .from('budget_lines')
      .insert({ property_id: PROPERTY_ID, project_id: input.project_id, description: input.description, estimated_amount: input.estimated_amount ?? null, actual_amount: input.actual_amount ?? null })
      .select('id, description, estimated_amount, actual_amount')
      .single()

    if (error || !data) return { type: 'tool_result', tool_use_id: id, content: `Error: ${error?.message}`, is_error: true }
    changes.push({ type: 'task_updated', summary: `Added budget line: ${data.description}` })
    return { type: 'tool_result', tool_use_id: id, content: JSON.stringify({ success: true, ...data }) }
  }

  // ── remove_budget_line ────────────────────────────────────────────
  if (block.name === 'remove_budget_line') {
    const { budget_line_id } = block.input as RemoveBudgetLineInput
    const { error } = await supabase.from('budget_lines').delete().eq('id', budget_line_id)

    if (error) return { type: 'tool_result', tool_use_id: id, content: `Error: ${error.message}`, is_error: true }
    changes.push({ type: 'task_updated', summary: 'Removed budget line' })
    return { type: 'tool_result', tool_use_id: id, content: JSON.stringify({ success: true }) }
  }

  // ── set_quarterly_budget ─────────────────────────────────────────
  if (block.name === 'set_quarterly_budget') {
    const { year, quarter, ...fields } = block.input as SetQuarterlyBudgetInput
    const { data, error } = await supabase
      .from('quarterly_budget')
      .upsert(
        { property_id: PROPERTY_ID, year, quarter, ...fields },
        { onConflict: 'property_id,year,quarter' }
      )
      .select()
      .single()

    if (error || !data) return { type: 'tool_result', tool_use_id: id, content: `Error: ${error?.message}`, is_error: true }
    changes.push({ type: 'budget_updated', summary: `Updated Q${quarter} ${year} budget` })
    return { type: 'tool_result', tool_use_id: id, content: JSON.stringify({ success: true, year, quarter }) }
  }

  // ── save_reference ───────────────────────────────────────────────
  if (block.name === 'save_reference') {
    const input = block.input as SaveReferenceInput
    const { data, error } = await supabase
      .from('saved_references')
      .insert({ property_id: PROPERTY_ID, type: input.type, name: input.name, notes: input.notes ?? null, url: input.url ?? null })
      .select('id, name, type')
      .single()

    if (error || !data) return { type: 'tool_result', tool_use_id: id, content: `Error: ${error?.message}`, is_error: true }
    changes.push({ type: 'reference_saved', summary: `Saved ${data.type}: ${data.name}` })
    return { type: 'tool_result', tool_use_id: id, content: JSON.stringify({ success: true, id: data.id, name: data.name, type: data.type }) }
  }

  // ── get_saved_references ─────────────────────────────────────────
  if (block.name === 'get_saved_references') {
    const { data: refs, error } = await supabase
      .from('saved_references')
      .select('id, type, name, notes, url, created_at')
      .eq('property_id', PROPERTY_ID)
      .order('type')
      .order('name')

    if (error) return { type: 'tool_result', tool_use_id: id, content: `Error: ${error.message}`, is_error: true }
    return { type: 'tool_result', tool_use_id: id, content: JSON.stringify(refs) }
  }

  // ── get_all_tasks ────────────────────────────────────────────────
  if (block.name === 'get_all_tasks') {
    const { data: allTasks, error } = await supabase
      .from('tasks')
      .select('id, title, status, due_date, project_id')
      .eq('property_id', PROPERTY_ID)
      .order('project_id')
      .order('created_at')

    if (error) return { type: 'tool_result', tool_use_id: id, content: `Error: ${error.message}`, is_error: true }

    const byProject: Record<string, typeof allTasks> = {}
    for (const task of allTasks ?? []) {
      byProject[task.project_id] ??= []
      byProject[task.project_id].push(task)
    }
    return { type: 'tool_result', tool_use_id: id, content: JSON.stringify(byProject) }
  }

  // ── update_project ───────────────────────────────────────────────
  if (block.name === 'update_project') {
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

    if (error || !data) return { type: 'tool_result', tool_use_id: id, content: `Error: ${error?.message}`, is_error: true }
    changes.push({ type: 'project_updated', summary: `Updated project: ${data.name}` })
    return { type: 'tool_result', tool_use_id: id, content: JSON.stringify({ success: true, id: data.id, name: data.name }) }
  }

  // ── create_goal ──────────────────────────────────────────────────
  if (block.name === 'create_goal') {
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

    if (error || !data) return { type: 'tool_result', tool_use_id: id, content: `Error: ${error?.message}`, is_error: true }
    changes.push({ type: 'project_updated', summary: `Created goal: ${data.name}` })
    return { type: 'tool_result', tool_use_id: id, content: JSON.stringify({ success: true, id: data.id, name: data.name }) }
  }

  // ── update_goal ──────────────────────────────────────────────────
  if (block.name === 'update_goal') {
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

    if (error || !data) return { type: 'tool_result', tool_use_id: id, content: `Error: ${error?.message}`, is_error: true }
    changes.push({ type: 'project_updated', summary: `Updated goal: ${data.name}` })
    return { type: 'tool_result', tool_use_id: id, content: JSON.stringify({ success: true, id: data.id, name: data.name }) }
  }

  // ── update_task ──────────────────────────────────────────────────
  if (block.name === 'update_task') {
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

    if (error || !data) return { type: 'tool_result', tool_use_id: id, content: `Error: ${error?.message}`, is_error: true }
    changes.push({ type: 'task_updated', summary: `Updated task: ${data.title}` })
    return { type: 'tool_result', tool_use_id: id, content: JSON.stringify({ success: true, id: data.id, title: data.title }) }
  }

  // ── log_purchase ─────────────────────────────────────────────────
  if (block.name === 'log_purchase') {
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

    if (error || !data) return { type: 'tool_result', tool_use_id: id, content: `Error: ${error?.message}`, is_error: true }
    const summary = [data.vendor, data.category, data.price != null ? `$${data.price}` : null].filter(Boolean).join(' · ')
    changes.push({ type: 'purchase_logged', summary: `Logged purchase: ${data.item_name}${summary ? ` (${summary})` : ''}` })
    return { type: 'tool_result', tool_use_id: id, content: JSON.stringify({ success: true, ...data }) }
  }

  // ── get_purchases ─────────────────────────────────────────────────
  if (block.name === 'get_purchases') {
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
    if (error) return { type: 'tool_result', tool_use_id: id, content: `Error: ${error.message}`, is_error: true }
    return { type: 'tool_result', tool_use_id: id, content: JSON.stringify(purchases) }
  }

  // ── add_task ─────────────────────────────────────────────────────
  if (block.name === 'add_task') {
    const input = block.input as AddTaskInput
    const { data, error } = await supabase
      .from('tasks')
      .insert({ property_id: PROPERTY_ID, project_id: input.project_id, title: input.title, status: input.status ?? 'todo', due_date: input.due_date ?? null })
      .select('id, title')
      .single()

    if (error || !data) return { type: 'tool_result', tool_use_id: id, content: `Error: ${error?.message}`, is_error: true }
    changes.push({ type: 'task_added', summary: `Added task: ${data.title}` })
    return { type: 'tool_result', tool_use_id: id, content: JSON.stringify({ success: true, id: data.id, title: data.title }) }
  }

  // ── parse_listing ────────────────────────────────────────────────
  if (block.name === 'parse_listing') {
    const input = block.input as ParseListingInput
    try {
      let contentText = ''

      if (input.source === 'url' && input.url) {
        const firecrawlText = await fetchWithFirecrawl(input.url)
        if (firecrawlText) {
          contentText = firecrawlText.slice(0, 60000)
        } else if (ZILLOW_REDFIN.test(input.url)) {
          return {
            type: 'tool_result', tool_use_id: id,
            content: 'Zillow and Redfin block automated access and Firecrawl is not configured. Ask the user to: open the listing in their browser, press Ctrl+A to select all, Ctrl+C to copy, then paste the text into this chat. Then call parse_listing again with source: "text".',
          }
        } else {
          const res = await fetch(input.url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HomeAgent/1.0)' },
            signal: AbortSignal.timeout(15000),
          })
          const html = await res.text()
          contentText = stripHtml(html)
          if (contentText.length < 200) {
            return {
              type: 'tool_result', tool_use_id: id,
              content: 'The page returned too little content to parse (likely blocked or JS-rendered). Ask the user to paste the listing text directly into the chat, then call parse_listing with source: "text".',
            }
          }
        }
      } else if (input.source === 'text' && input.text) {
        contentText = input.text.slice(0, 60000)
      } else {
        return { type: 'tool_result', tool_use_id: id, content: 'Error: provide url with source "url" or text with source "text"', is_error: true }
      }

      const parseMsg = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages: [{ role: 'user', content: `Property listing content:\n\n${contentText}\n\n${LISTING_PARSE_PROMPT}` }],
      })
      const raw = parseMsg.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map(b => b.text).join('')
      const parsed = extractListingJson(raw)
      if (!parsed) {
        return { type: 'tool_result', tool_use_id: id, content: 'Could not extract structured data from this content.', is_error: true }
      }
      return { type: 'tool_result', tool_use_id: id, content: JSON.stringify(parsed) }
    } catch (e) {
      return { type: 'tool_result', tool_use_id: id, content: `Error parsing listing: ${String(e)}`, is_error: true }
    }
  }

  // ── update_property_details ──────────────────────────────────────
  if (block.name === 'update_property_details') {
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
    if (error) return { type: 'tool_result', tool_use_id: id, content: `Error: ${error.message}`, is_error: true }
    changes.push({ type: 'project_updated', summary: 'Updated property details' })
    return { type: 'tool_result', tool_use_id: id, content: JSON.stringify({ success: true }) }
  }

  // ── create_asset ─────────────────────────────────────────────────
  if (block.name === 'create_asset') {
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

    if (error || !data) return { type: 'tool_result', tool_use_id: id, content: `Error: ${error?.message}`, is_error: true }
    changes.push({ type: 'project_updated', summary: `Added asset: ${data.name}` })
    return { type: 'tool_result', tool_use_id: id, content: JSON.stringify({ success: true, id: data.id, name: data.name, asset_type: data.asset_type }) }
  }

  // ── get_property_photos ──────────────────────────────────────────────────────
  if (block.name === 'get_property_photos') {
    const { data: files, error } = await supabase.storage
      .from('Home Agent')
      .list(PROPERTY_ID, { limit: 50, sortBy: { column: 'created_at', order: 'desc' } })

    if (error) return { type: 'tool_result', tool_use_id: id, content: `Error listing photos: ${error.message}`, is_error: true }
    if (!files?.length) return { type: 'tool_result', tool_use_id: id, content: 'No photos uploaded yet. Ask the user to upload photos in the Photos tab first.' }

    const imageExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic']
    const photos = files.filter(f => imageExts.some(ext => f.name.toLowerCase().endsWith(ext)))
    if (!photos.length) return { type: 'tool_result', tool_use_id: id, content: 'No image files found in property photos.' }

    const signed = await Promise.all(
      photos.map(async f => {
        const path = `${PROPERTY_ID}/${f.name}`
        const { data: urlData } = await supabase.storage.from('Home Agent').createSignedUrl(path, 3600)
        return { name: f.name, path, url: urlData?.signedUrl ?? null }
      })
    )

    return { type: 'tool_result', tool_use_id: id, content: JSON.stringify(signed.filter(p => p.url)) }
  }

  // ── derive_visual_from_photo ─────────────────────────────────────────────────
  if (block.name === 'derive_visual_from_photo') {
    const { photo_url, config_notes } = block.input as { photo_url: string; config_notes?: string }

    const DERIVE_PROMPT = `You are analysing an aerial or overhead photograph of a property to create a 2D site plan.

Identify all major zones and structures visible. Return ONLY valid JSON with no markdown, matching this exact structure:

{
  "bounds": { "width": 100, "height": 80 },
  "zones": [
    { "id": "house", "name": "House & Gardens", "color": "#4ade80", "x": 10, "y": 5, "width": 40, "height": 35, "description": "Main residence and gardens" }
  ],
  "buildings": [
    { "id": "main_house", "label": "House", "x": 15, "y": 8, "width": 18, "height": 22, "color": "#8ba3b8" }
  ]
}

Rules:
- Coordinate space is 0–100 wide × 0–80 tall. Position everything proportionally.
- Zones are large named areas (house zone, barn zone, pasture, pool, drive, etc.)
- Buildings are actual structures within zones
- Use clear, lowercase IDs: house, barn, pool, pasture, woodland, drive, garage, shed, etc.
- Use visually distinct, muted hex colors for zones
- Include 2–8 zones based on what you see
- Top of image is typically north
- Zones should tile to cover the full property without large gaps`

    try {
      const result = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'url', url: photo_url } },
            { type: 'text',  text: DERIVE_PROMPT },
          ],
        }],
      })

      const raw = result.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text).join('').trim()

      // Extract JSON
      let site_config: unknown = null
      try { site_config = JSON.parse(raw) } catch {
        const m = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (m) try { site_config = JSON.parse(m[1].trim()) } catch { /* */ }
        if (!site_config) {
          const s = raw.indexOf('{'), e = raw.lastIndexOf('}')
          if (s !== -1 && e > s) try { site_config = JSON.parse(raw.slice(s, e + 1)) } catch { /* */ }
        }
      }

      if (!site_config) {
        return { type: 'tool_result', tool_use_id: id, content: 'Could not parse a valid site config from the photo. Try a clearer overhead or aerial image.', is_error: true }
      }

      const { error: saveErr } = await supabase
        .from('property_visual_config')
        .upsert(
          { property_id: PROPERTY_ID, site_config, config_notes: config_notes ?? 'Derived from photo', updated_at: new Date().toISOString() },
          { onConflict: 'property_id' }
        )

      if (saveErr) return { type: 'tool_result', tool_use_id: id, content: `Derived config but failed to save: ${saveErr.message}`, is_error: true }

      changes.push({ type: 'project_updated', summary: 'Derived and saved property site plan from photo' })
      return { type: 'tool_result', tool_use_id: id, content: JSON.stringify({ success: true, site_config }) }
    } catch (e) {
      return { type: 'tool_result', tool_use_id: id, content: `Error analysing photo: ${String(e)}`, is_error: true }
    }
  }

  // ── update_visual_config ─────────────────────────────────────────────────────
  if (block.name === 'update_visual_config') {
    const { site_config, config_notes } = block.input as { site_config: unknown; config_notes?: string }

    const { error } = await supabase
      .from('property_visual_config')
      .upsert(
        { property_id: PROPERTY_ID, site_config, config_notes: config_notes ?? null, updated_at: new Date().toISOString() },
        { onConflict: 'property_id' }
      )

    if (error) return { type: 'tool_result', tool_use_id: id, content: `Error: ${error.message}`, is_error: true }
    changes.push({ type: 'project_updated', summary: 'Updated property visual config' })
    return { type: 'tool_result', tool_use_id: id, content: JSON.stringify({ success: true }) }
  }

  // ── get_rooms ────────────────────────────────────────────────────────────────
  if (block.name === 'get_rooms') {
    const { zone_id } = block.input as { zone_id?: string }

    let query = supabase
      .from('rooms')
      .select('id, zone_id, name, status, notes, sort_order, pos_x, pos_y, pos_w, pos_h')
      .eq('property_id', PROPERTY_ID)
      .order('sort_order')
      .order('name')

    if (zone_id) query = query.eq('zone_id', zone_id)

    const { data, error } = await query
    if (error) return { type: 'tool_result', tool_use_id: id, content: `Error: ${error.message}`, is_error: true }
    return { type: 'tool_result', tool_use_id: id, content: JSON.stringify(data ?? []) }
  }

  // ── manage_room ──────────────────────────────────────────────────────────────
  if (block.name === 'manage_room') {
    const input = block.input as {
      action: 'create' | 'update' | 'delete'
      zone_id?: string; room_id?: string; name?: string; status?: string
      notes?: string; sort_order?: number
      pos_x?: number; pos_y?: number; pos_w?: number; pos_h?: number
    }

    if (input.action === 'create') {
      if (!input.zone_id || !input.name) {
        return { type: 'tool_result', tool_use_id: id, content: 'zone_id and name are required for create', is_error: true }
      }
      const { data, error } = await supabase
        .from('rooms')
        .insert({
          property_id: PROPERTY_ID,
          zone_id:     input.zone_id,
          name:        input.name,
          status:      input.status     ?? 'not_started',
          notes:       input.notes      ?? null,
          sort_order:  input.sort_order ?? 0,
          pos_x: input.pos_x ?? null, pos_y: input.pos_y ?? null,
          pos_w: input.pos_w ?? null, pos_h: input.pos_h ?? null,
        })
        .select('id, name, zone_id, status')
        .single()

      if (error || !data) return { type: 'tool_result', tool_use_id: id, content: `Error: ${error?.message}`, is_error: true }
      changes.push({ type: 'project_updated', summary: `Created room: ${data.name}` })
      return { type: 'tool_result', tool_use_id: id, content: JSON.stringify({ success: true, ...data }) }
    }

    if (input.action === 'update') {
      if (!input.room_id) return { type: 'tool_result', tool_use_id: id, content: 'room_id is required for update', is_error: true }
      const updates: Record<string, unknown> = {}
      if (input.name       !== undefined) updates.name       = input.name
      if (input.status     !== undefined) updates.status     = input.status
      if (input.notes      !== undefined) updates.notes      = input.notes
      if (input.sort_order !== undefined) updates.sort_order = input.sort_order
      if (input.pos_x      !== undefined) updates.pos_x      = input.pos_x
      if (input.pos_y      !== undefined) updates.pos_y      = input.pos_y
      if (input.pos_w      !== undefined) updates.pos_w      = input.pos_w
      if (input.pos_h      !== undefined) updates.pos_h      = input.pos_h

      const { data, error } = await supabase
        .from('rooms')
        .update(updates)
        .eq('id', input.room_id)
        .eq('property_id', PROPERTY_ID)
        .select('id, name, status')
        .single()

      if (error || !data) return { type: 'tool_result', tool_use_id: id, content: `Error: ${error?.message}`, is_error: true }
      changes.push({ type: 'project_updated', summary: `Updated room: ${data.name}` })
      return { type: 'tool_result', tool_use_id: id, content: JSON.stringify({ success: true, ...data }) }
    }

    if (input.action === 'delete') {
      if (!input.room_id) return { type: 'tool_result', tool_use_id: id, content: 'room_id is required for delete', is_error: true }
      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', input.room_id)
        .eq('property_id', PROPERTY_ID)

      if (error) return { type: 'tool_result', tool_use_id: id, content: `Error: ${error.message}`, is_error: true }
      changes.push({ type: 'project_updated', summary: 'Deleted room' })
      return { type: 'tool_result', tool_use_id: id, content: JSON.stringify({ success: true }) }
    }

    return { type: 'tool_result', tool_use_id: id, content: 'Unknown action — use create, update, or delete', is_error: true }
  }

  return { type: 'tool_result', tool_use_id: id, content: `Unknown tool: ${block.name}`, is_error: true }
}
