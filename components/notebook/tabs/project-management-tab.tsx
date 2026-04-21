'use client'

import { useState } from 'react'
import { type Project } from '../project-card'
import { type Goal } from '../goals-panel'
import { ProjectSlideOver } from '../project-slide-over'
import { quarterLabel } from '../quarter-utils'

const DOMAIN_LABELS: Record<string, string> = {
  renovation: 'Renovation', farm: 'Farm', grounds: 'Grounds',
  maintenance: 'Maintenance', 'home-systems': 'Home Systems',
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

type Props = {
  projects: (Project & { goal_id: string | null })[]
  goals: Goal[]
  isOwner: boolean
}

export function ProjectManagementTab({ projects, goals, isOwner }: Props) {
  const [selected, setSelected] = useState<(Project & { goal_id: string | null }) | null>(null)

  const grouped: Record<string, (Project & { goal_id: string | null })[]> = {}
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

  return (
    <>
      <div className="space-y-8">
        {Object.entries(grouped).map(([domain, domainProjects]) => (
          <section key={domain}>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">
              {DOMAIN_LABELS[domain] ?? domain}
            </h2>
            <div className="space-y-2">
              {domainProjects.map(p => {
                const doneTasks  = p.tasks.filter(t => t.status === 'done').length
                const totalTasks = p.tasks.length
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelected(p)}
                    className="w-full text-left border border-zinc-200 rounded-lg p-4 hover:border-zinc-400 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[p.priority] ?? 'bg-zinc-300'}`} />
                        <span className={`font-medium leading-snug ${p.status === 'cancelled' ? 'text-zinc-400 line-through' : 'text-zinc-900'}`}>{p.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {p.effort && (
                          <span className="text-xs text-zinc-400">{EFFORT_LABEL[p.effort]}</span>
                        )}
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
                          <div
                            className="h-full bg-green-400 rounded-full"
                            style={{ width: `${totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0}%` }}
                          />
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

      <ProjectSlideOver
        project={selected}
        goals={goals}
        isOwner={isOwner}
        onClose={() => setSelected(null)}
      />
    </>
  )
}
