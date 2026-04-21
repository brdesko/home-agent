import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPropertyId } from '@/lib/get-property-id'
import { type Project } from '@/components/notebook/project-card'
import { type TimelineEvent } from '@/components/notebook/timeline-panel'
import { AutoRefresh } from '@/components/notebook/auto-refresh'
import { type Goal } from '@/components/notebook/goals-panel'
import { type QuarterlyBudget } from '@/components/notebook/budget-tab'
import { type OngoingTask } from '@/components/notebook/tabs/todo-tab'
import { type CalendarEvent } from '@/components/notebook/tabs/calendar-tab'
import { NotebookTabs } from '@/components/notebook/notebook-tabs'
import Link from 'next/link'

const DOMAIN_ORDER = ['renovation', 'farm', 'grounds', 'maintenance', 'home-systems']

function locationSubtitle(name: string, address: string | null): string | null {
  if (!address) return null
  const lower = address.toLowerCase()
  if (lower.startsWith(name.toLowerCase())) {
    return address.slice(name.length).replace(/^[,\s]+/, '') || null
  }
  return address
}

const SAGE = 'oklch(0.50 0.10 155)'

export default async function HomePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const propertyId = await getPropertyId(supabase, user.id)
  if (!propertyId) redirect('/login')

  const { data: propertyData } = await supabase
    .from('property_members')
    .select('role, properties(id, name, address)')
    .eq('user_id', user.id)
    .eq('property_id', propertyId)
    .single()

  if (!propertyData) redirect('/login')

  const property = propertyData.properties as unknown as { id: string; name: string; address: string | null }
  const isOwner  = propertyData.role === 'owner'
  const today    = new Date().toISOString().split('T')[0]

  const [projectsResult, eventsResult, goalsResult, budgetResult, ongoingResult, calendarResult] = await Promise.all([
    supabase.from('projects').select('*, tasks(*), budget_lines(*), timeline_events(*)').eq('property_id', propertyId).order('name'),
    supabase.from('timeline_events').select('*').eq('property_id', propertyId).gte('event_date', today).order('event_date').limit(8),
    supabase.from('goals').select('*').eq('property_id', propertyId).order('sort_order').order('name'),
    supabase.from('quarterly_budget').select('*').eq('property_id', propertyId).order('year', { ascending: false }).order('quarter', { ascending: false }).limit(6),
    supabase.from('ongoing_tasks').select('*').eq('property_id', propertyId).order('title'),
    supabase.from('calendar_events').select('*').eq('property_id', propertyId).order('start_date'),
  ])

  const projects         = (projectsResult.data ?? []) as (Project & { goal_id: string | null })[]
  const events           = (eventsResult.data   ?? []) as TimelineEvent[]
  const goals            = (goalsResult.data    ?? []) as Goal[]
  const quarterlyBudgets = (budgetResult.data   ?? []) as QuarterlyBudget[]
  const ongoingTasks     = (ongoingResult.data  ?? []) as OngoingTask[]
  const calendarEvents   = (calendarResult.data ?? []) as CalendarEvent[]

  const isEmpty = projects.length === 0 && goals.length === 0

  if (isEmpty) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 pt-7 pb-4 border-b border-zinc-100">
          <h1 className="text-[28px] font-display text-zinc-800 leading-tight">{property.name}</h1>
          {property.address && (
            <p className="text-sm text-zinc-400 mt-1">{locationSubtitle(property.name, property.address) ?? property.address}</p>
          )}
        </div>
        <div className="max-w-lg mx-auto px-8 py-20 text-center space-y-6">
          <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center" style={{ backgroundColor: 'oklch(0.96 0.03 155)' }}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: SAGE }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline strokeLinecap="round" strokeLinejoin="round" points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="font-display text-2xl text-zinc-800">Fresh notebook.</h2>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Start by telling the Agent about this property — paste a Zillow or Redfin URL, describe what you own, or share your first project idea. The Agent will structure it into your notebook.
            </p>
          </div>
          <div className="space-y-3">
            <Link
              href="/agent"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: SAGE }}
            >
              Open the Agent →
            </Link>
            <p className="text-xs text-zinc-400">
              Try: <span className="italic">"My property is at 123 Main St. Here's the Zillow link: ..."</span>
            </p>
          </div>
          <div className="border border-zinc-100 rounded-xl p-5 text-left space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Suggested first steps</p>
            <ul className="space-y-2 text-sm text-zinc-600">
              <li className="flex gap-2"><span style={{ color: SAGE }}>→</span> Paste a property listing URL so the Agent can fill in your home details</li>
              <li className="flex gap-2"><span style={{ color: SAGE }}>→</span> Share your top 1–3 goals for this property this year</li>
              <li className="flex gap-2"><span style={{ color: SAGE }}>→</span> Describe your first project and the Agent will create tasks and a budget estimate</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  const goalsWithProgress = goals.map(goal => {
    const linked = projects.filter(p => p.goal_id === goal.id && p.status !== 'cancelled')
    return {
      ...goal,
      totalProjects:    linked.length,
      activeProjects:   linked.filter(p => p.status === 'active').length,
      completeProjects: linked.filter(p => p.status === 'complete').length,
      estimatedSpend:   linked.reduce((sum, p) => sum + p.budget_lines.reduce((s, b) => s + (b.estimated_amount ?? 0), 0), 0),
      actualSpend:      linked.reduce((sum, p) => sum + (p.actual_spend ?? 0), 0),
    }
  })

  const grouped: Record<string, Project[]> = {}
  for (const domain of DOMAIN_ORDER) {
    const inDomain = projects.filter(p => p.domain === domain)
    if (inDomain.length > 0) grouped[domain] = inDomain
  }
  for (const project of projects) {
    if (!DOMAIN_ORDER.includes(project.domain)) {
      grouped[project.domain] ??= []
      grouped[project.domain].push(project)
    }
  }

  const now            = new Date()
  const currentYear    = now.getFullYear()
  const currentQuarter = Math.ceil((now.getMonth() + 1) / 3)
  const activeCount    = projects.filter(p => p.status === 'active').length
  const openTaskCount  = projects.filter(p => p.status === 'active').flatMap(p => p.tasks).filter(t => t.status === 'todo' || t.status === 'in_progress').length
  const currentQB      = quarterlyBudgets.find(b => b.year === currentYear && b.quarter === currentQuarter)
  const budgetedThisQuarter = currentQB
    ? Math.round((currentQB.core_income + currentQB.additional_income - currentQB.core_expenses - currentQB.additional_expenses) * currentQB.allocation_pct) / 100
    : null

  return (
    <div className="flex-1 overflow-y-auto">
      <AutoRefresh />
      <div className="px-8 pt-7 pb-4 border-b border-zinc-100">
        <h1 className="text-[28px] font-display text-zinc-800 leading-tight">Notebook</h1>
        <div className="flex items-center gap-3 mt-3 text-xs text-zinc-400">
          <span>{activeCount} active project{activeCount !== 1 ? 's' : ''}</span>
          <span className="text-zinc-200">·</span>
          <span>{openTaskCount} open task{openTaskCount !== 1 ? 's' : ''}</span>
          <span className="text-zinc-200">·</span>
          <span>Q{currentQuarter} {currentYear}</span>
          {budgetedThisQuarter != null && (
            <>
              <span className="text-zinc-200">·</span>
              <span>{budgetedThisQuarter >= 1000 ? `$${Math.round(budgetedThisQuarter / 1000)}k` : `$${budgetedThisQuarter}`} budgeted</span>
            </>
          )}
        </div>
      </div>
      <NotebookTabs
        projects={projects}
        events={events}
        goals={goalsWithProgress}
        quarterlyBudgets={quarterlyBudgets}
        ongoingTasks={ongoingTasks}
        calendarEvents={calendarEvents}
        grouped={grouped}
        isOwner={isOwner}
      />
    </div>
  )
}
