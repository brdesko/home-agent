import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SignOutButton from '@/components/sign-out-button'
import Link from 'next/link'
import { ProjectCard, type Project } from '@/components/notebook/project-card'
import { TimelinePanel, type TimelineEvent } from '@/components/notebook/timeline-panel'
import { BudgetPanel } from '@/components/notebook/budget-panel'

const DOMAIN_LABELS: Record<string, string> = {
  renovation:    'Renovation',
  farm:          'Farm',
  grounds:       'Grounds',
  maintenance:   'Maintenance',
  'home-systems': 'Home Systems',
}

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

  const membership  = memberships[0]
  const property    = membership.properties as unknown as { id: string; name: string; address: string | null }
  const isOwner     = membership.role === 'owner'
  const propertyId  = property.id
  const today       = new Date().toISOString().split('T')[0]

  const [projectsResult, eventsResult] = await Promise.all([
    supabase
      .from('projects')
      .select('*, tasks(*), budget_lines(*)')
      .eq('property_id', propertyId)
      .order('name'),
    supabase
      .from('timeline_events')
      .select('*')
      .eq('property_id', propertyId)
      .gte('event_date', today)
      .order('event_date')
      .limit(8),
  ])

  const projects = (projectsResult.data ?? []) as Project[]
  const events   = (eventsResult.data ?? []) as TimelineEvent[]

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
      <header className="border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">Property Notebook</p>
          <h1 className="text-xl font-semibold text-zinc-900">{property.name}</h1>
          {property.address && (
            <p className="text-sm text-zinc-500">{property.address}</p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Link href="/agent" className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors">
            Agent →
          </Link>
          <span className="text-sm text-zinc-400">{user.email}</span>
          <SignOutButton />
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 flex gap-10">
        {/* Projects */}
        <main className="flex-1 min-w-0 space-y-10">
          {Object.entries(grouped).map(([domain, domainProjects]) => (
            <section key={domain}>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-4">
                {DOMAIN_LABELS[domain] ?? domain}
              </h2>
              <div className="space-y-3">
                {domainProjects.map(project => (
                  <ProjectCard key={project.id} project={project} isOwner={isOwner} />
                ))}
              </div>
            </section>
          ))}
        </main>

        {/* Sidebar */}
        <aside className="w-64 shrink-0 space-y-8 pt-1">
          <TimelinePanel events={events} />
          {isOwner && <BudgetPanel projects={projects} />}
        </aside>
      </div>
    </div>
  )
}
