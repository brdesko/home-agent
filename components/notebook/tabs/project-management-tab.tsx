'use client'

import { useState } from 'react'
import { type Project } from '../project-card'
import { type Goal } from '../goals-panel'
import { ProjectSlideOver } from '../project-slide-over'
import { PastProjectForm } from '../past-project-form'
import { quarterLabel } from '../quarter-utils'

const DOMAIN_LABELS: Record<string, string> = {
  renovation: 'Renovation', farm: 'Farm', grounds: 'Grounds',
  maintenance: 'Maintenance', 'home-systems': 'Home Systems',
}

const DOMAIN_COLORS: Record<string, string> = {
  renovation:    'oklch(0.68 0.14 65)',   // amber
  farm:          'oklch(0.50 0.10 155)',  // sage green
  grounds:       'oklch(0.55 0.12 168)',  // emerald
  maintenance:   'oklch(0.55 0.11 250)', // slate blue
  'home-systems':'oklch(0.50 0.10 300)', // muted violet
}

const DOMAIN_ORDER = ['renovation', 'farm', 'grounds', 'maintenance', 'home-systems']

const STATUS_STYLES: Record<string, string> = {
  planned:   'bg-zinc-100 text-zinc-500',
  active:    'bg-blue-50 text-blue-700',
  on_hold:   'bg-amber-50 text-amber-700',
  complete:  'bg-green-50 text-green-700',
  cancelled: 'bg-zinc-100 text-zinc-400',
}

const EFFORT_LABEL: Record<string, string> = {
  low: 'Low', medium: 'Medium', high: 'High', very_high: 'Very high',
}

const PRIORITY_DOT: Record<string, string> = {
  high: 'bg-red-400', medium: 'bg-amber-400', low: 'bg-zinc-300',
}

type ProjectRow = Project & { goal_id: string | null }

type Props = {
  projects: ProjectRow[]
  goals: Goal[]
  isOwner: boolean
}

function ProjectGroup({ projects, onSelect }: { projects: ProjectRow[]; onSelect: (p: ProjectRow) => void }) {
  const grouped: Record<string, ProjectRow[]> = {}
  for (const domain of DOMAIN_ORDER) {
    const inDomain = projects.filter(p => p.domain === domain)
    if (inDomain.length > 0) grouped[domain] = inDomain
  }
  for (const p of projects) {
    if (!DOMAIN_ORDER.includes(p.domain)) {
      grouped[p.domain] ??= []
      grouped[p.domain].push(p)
    }
  }

  if (Object.keys(grouped).length === 0) {
    return <p className="text-sm text-zinc-400 py-6 italic">Nothing here yet. Ask the Agent to add one.</p>
  }

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([domain, domainProjects]) => (
        <section key={domain}>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-600 mb-3">
            {DOMAIN_LABELS[domain] ?? domain}
          </h2>
          <div className="space-y-2">
            {domainProjects.map(p => {
              const doneTasks  = p.tasks.filter(t => t.status === 'done').length
              const totalTasks = p.tasks.length
              return (
                <button key={p.id} onClick={() => onSelect(p)}
                  style={{ borderLeftColor: DOMAIN_COLORS[p.domain] ?? '#a1a1aa', borderLeftWidth: '3px' }}
                  className="w-full text-left border border-zinc-200 rounded-lg p-4 hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[p.priority] ?? 'bg-zinc-300'}`} />
                      <span className={`font-medium leading-snug ${p.status === 'cancelled' ? 'text-zinc-400 line-through' : p.status === 'complete' ? 'text-zinc-400' : 'text-zinc-700'}`}>{p.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {p.effort && <span className="text-xs text-zinc-400">{EFFORT_LABEL[p.effort]}</span>}
                      {p.target_year && p.target_quarter && (
                        <span className="text-xs text-zinc-400">{quarterLabel(p.target_year, p.target_quarter)}</span>
                      )}
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[p.status] ?? 'bg-zinc-100 text-zinc-500'}`}>
                        {p.status.replace('_', '\u00a0')}
                      </span>
                    </div>
                  </div>
                  {p.description && (
                    <p className="mt-1.5 text-sm text-zinc-500 leading-relaxed line-clamp-2 ml-4">{p.description}</p>
                  )}
                  {totalTasks > 0 && (
                    <div className="mt-2 flex items-center gap-2 ml-4">
                      <div className="flex-1 h-1 bg-zinc-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(doneTasks / totalTasks) * 100}%`, backgroundColor: 'var(--sage)' }} />
                      </div>
                      <span className="text-xs text-zinc-400 shrink-0">{doneTasks}/{totalTasks} tasks</span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

export function ProjectManagementTab({ projects: initialProjects, goals, isOwner }: Props) {
  const [projects,    setProjects]   = useState<ProjectRow[]>(initialProjects)
  const [selected,    setSelected]   = useState<ProjectRow | null>(null)
  const [view,        setView]       = useState<'active' | 'archive'>('active')
  const [archiveTab,  setArchiveTab] = useState<'complete' | 'cancelled'>('complete')
  const [showPastForm, setShowPastForm] = useState(false)

  const activeProjects    = projects.filter(p => p.status !== 'complete' && p.status !== 'cancelled')
  const completedProjects = projects.filter(p => p.status === 'complete')
  const cancelledProjects = projects.filter(p => p.status === 'cancelled')

  function handleProjectArchived(projectId: string, status: 'complete' | 'cancelled') {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status } : p))
    setSelected(null)
    setView('archive')
    setArchiveTab(status)
  }

  function handlePastProjectCreated(raw: Record<string, unknown>) {
    const newProject: ProjectRow = {
      ...(raw as unknown as Project),
      goal_id: (raw.goal_id as string | null) ?? null,
      tasks: [],
      budget_lines: [],
      timeline_events: [],
    }
    setProjects(prev => [...prev, newProject])
    setShowPastForm(false)
    setView('archive')
    setArchiveTab('complete')
    setSelected(newProject)
  }

  return (
    <>
      <div className="space-y-6">
        {/* View toggle */}
        <div className="flex items-center gap-0 border-b border-zinc-100">
          <button
            onClick={() => setView('active')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${view === 'active' ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
          >
            Active
            <span className="ml-1.5 text-xs text-zinc-400">{activeProjects.length}</span>
          </button>
          <button
            onClick={() => setView('archive')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${view === 'archive' ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
          >
            Archive
            <span className="ml-1.5 text-xs text-zinc-400">{completedProjects.length + cancelledProjects.length}</span>
          </button>
        </div>

        {view === 'active' && (
          <ProjectGroup projects={activeProjects} onSelect={setSelected} />
        )}

        {view === 'archive' && (
          <div className="space-y-4">
            {/* Archive sub-tabs + add button */}
            <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <button
                onClick={() => setArchiveTab('complete')}
                className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${archiveTab === 'complete' ? 'bg-green-50 text-green-700' : 'text-zinc-400 hover:text-zinc-600'}`}
              >
                Completed ({completedProjects.length})
              </button>
              <button
                onClick={() => setArchiveTab('cancelled')}
                className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${archiveTab === 'cancelled' ? 'bg-zinc-100 text-zinc-600' : 'text-zinc-400 hover:text-zinc-600'}`}
              >
                Cancelled ({cancelledProjects.length})
              </button>
            </div>
            <button
              onClick={() => setShowPastForm(true)}
              className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              + Add past project
            </button>
            </div>

            <ProjectGroup
              projects={archiveTab === 'complete' ? completedProjects : cancelledProjects}
              onSelect={setSelected}
            />
          </div>
        )}
      </div>

      <ProjectSlideOver
        project={selected}
        goals={goals}
        allProjects={projects}
        isOwner={isOwner}
        onClose={() => setSelected(null)}
        onArchived={handleProjectArchived}
      />

      {showPastForm && (
        <PastProjectForm
          goals={goals}
          onClose={() => setShowPastForm(false)}
          onCreated={handlePastProjectCreated}
        />
      )}
    </>
  )
}
