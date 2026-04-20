/**
 * Loads supabase/seed/5090-durham.json into the database.
 *
 * Uses the service-role key so it bypasses RLS — correct for seeding.
 * Safe to re-run: all upserts are keyed on id.
 *
 * Prerequisites:
 *   NEXT_PUBLIC_SUPABASE_URL     — already in .env.local
 *   SUPABASE_SERVICE_ROLE_KEY    — add this to .env.local (find it in
 *                                  Supabase dashboard → Project Settings → API)
 *
 * Run with:
 *   npm run seed:property
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.')
  console.error('Add SUPABASE_SERVICE_ROLE_KEY to .env.local (Supabase dashboard → Project Settings → API).')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
})

const seedPath = join(process.cwd(), 'supabase', 'seed', '5090-durham.json')
const seed = JSON.parse(readFileSync(seedPath, 'utf-8'))

const propertyId = seed.property_id
const userMap: Record<string, string> = seed.users

function resolveUser(key: string | undefined): string | null {
  if (!key) return null
  return userMap[key] ?? key
}

async function upsert(table: string, rows: object[], context: string) {
  if (rows.length === 0) return
  const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' })
  if (error) {
    console.error(`  ✗ ${context}:`, error.message)
    process.exit(1)
  }
  console.log(`  ✓ ${context} (${rows.length})`)
}

async function main() {
  console.log(`\nSeeding property: ${propertyId}\n`)

  // Goals (must come before projects so goal_id FKs resolve)
  const goals = (seed.goals ?? []).map((g: any) => ({
    id:          g.id,
    property_id: propertyId,
    name:        g.name,
    description: g.description ?? null,
    status:      g.status,
    priority:    g.priority,
  }))
  await upsert('goals', goals, 'goals')

  // Assets
  const assets = seed.assets.map((a: any) => ({
    id:          a.id,
    property_id: propertyId,
    name:        a.name,
    asset_type:  a.asset_type,
    description: a.description ?? null,
  }))
  await upsert('assets', assets, 'assets')

  // Projects, tasks, budget_lines — one project at a time to preserve readability
  for (const project of seed.projects) {
    const projectRow = {
      id:          project.id,
      property_id: propertyId,
      name:        project.name,
      domain:      project.domain,
      status:      project.status,
      priority:    project.priority,
      description: project.description ?? null,
      goal_id:     project.goal_id ?? null,
    }
    await upsert('projects', [projectRow], `project: ${project.name}`)

    const tasks = (project.tasks ?? []).map((t: any) => ({
      id:          t.id,
      property_id: propertyId,
      project_id:  project.id,
      title:       t.title,
      description: t.description ?? null,
      status:      t.status,
      due_date:    t.due_date ?? null,
      assigned_to: resolveUser(t.assigned_to),
    }))
    await upsert('tasks', tasks, `  tasks (${project.name})`)

    const budgetLines = (project.budget_lines ?? []).map((b: any) => ({
      id:          b.id,
      property_id: propertyId,
      project_id:  project.id,
      description: b.description,
      amount:      b.amount,
      line_type:   b.line_type,
      category:    b.category ?? null,
    }))
    await upsert('budget_lines', budgetLines, `  budget lines (${project.name})`)
  }

  // Timeline events
  const events = seed.timeline_events.map((e: any) => ({
    id:          e.id,
    property_id: propertyId,
    project_id:  e.project_id ?? null,
    title:       e.title,
    description: e.description ?? null,
    event_date:  e.event_date,
  }))
  await upsert('timeline_events', events, 'timeline events')

  console.log('\nDone.\n')
}

main()
