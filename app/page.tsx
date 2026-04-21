import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SignOutButton from '@/components/sign-out-button'
import Link from 'next/link'
import { type Project } from '@/components/notebook/project-card'
import { type TimelineEvent } from '@/components/notebook/timeline-panel'
import { AutoRefresh } from '@/components/notebook/auto-refresh'
import { type Goal } from '@/components/notebook/goals-panel'
import { type QuarterlyBudget } from '@/components/notebook/budget-tab'
import { NotebookTabs } from '@/components/notebook/notebook-tabs'

const DOMAIN_ORDER = ['renovation', 'farm', 'grounds', 'maintenance', 'home-systems']

export default async function HomePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: memberships } = await supabase
    .from('property_members')
    .select('role, properties(id, name, address)')
    .eq('user_id', user.id)
    .limit(1)

  if (!memberships || memberships.length === 0) redirect('/login')

  const membership = memberships[0]
  const property   = membership.properties as unknown as { id: string; name: string; address: string | null }
  const isOwner    = membership.role === 'owner'
  const propertyId = property.id
  const today      = new Date().toISOString().split('T')[0]

  const [projectsResult, eventsResult, goalsResult, budgetResult] = await Promise.all([
    supabase
      .from('projects')
      .select('*, tasks(*), budget_lines(*), timeline_events(*)')
      .eq('property_id', propertyId)
      .order('name'),
    supabase
      .from('timeline_events')
      .select('*')
      .eq('property_id', propertyId)
      .gte('event_date', today)
      .order('event_date')
      .limit(8),
    supabase
      .from('goals')
      .select('*')
      .eq('property_id', propertyId)
      .order('priority', { ascending: false })
      .order('name'),
    supabase
      .from('quarterly_budget')
      .select('*')
      .eq('property_id', propertyId)
      .order('year', { ascending: false })
      .order('quarter', { ascending: false })
      .limit(6),
  ])

  const projects        = (projectsResult.data ?? []) as (Project & { goal_id: string | null })[]
  const events          = (eventsResult.data  ?? []) as TimelineEvent[]
  const goals           = (goalsResult.data   ?? []) as Goal[]
  const quarterlyBudgets = (budgetResult.data  ?? []) as QuarterlyBudget[]

  // Attach project progress counts to each goal
  const goalsWithProgress = goals.map(goal => ({
    ...goal,
    totalProjects:    projects.filter(p => p.goal_id === goal.id).length,
    activeProjects:   projects.filter(p => p.goal_id === goal.id && p.status === 'active').length,
    completeProjects: projects.filter(p => p.goal_id === goal.id && p.status === 'complete').length,
  }))

  // Group projects by domain, respecting preferred order
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

  return (
    <div className="min-h-screen bg-white">
      <AutoRefresh />

      <header className="border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">Property Notebook</p>
          <h1 className="text-xl font-semibold text-zinc-900">{property.name}</h1>
          {property.address && (
            <p className="text-sm text-zinc-500">{property.address}</p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Link href="/references" className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors">
            References →
          </Link>
          <Link href="/agent" className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors">
            Agent →
          </Link>
          <span className="text-sm text-zinc-400">{user.email}</span>
          <SignOutButton />
        </div>
      </header>

      <NotebookTabs
        projects={projects}
        events={events}
        goals={goalsWithProgress}
        quarterlyBudgets={quarterlyBudgets}
        grouped={grouped}
        isOwner={isOwner}
      />
    </div>
  )
}
