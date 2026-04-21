'use client'

import { useState } from 'react'
import { type Project } from './project-card'
import { type TimelineEvent } from './timeline-panel'
import { type Goal } from './goals-panel'
import { type QuarterlyBudget } from './budget-tab'
import { ProjectManagementTab } from './tabs/project-management-tab'
import { TodoTab } from './tabs/todo-tab'
import { DashboardTab } from './tabs/dashboard-tab'

type GoalWithProgress = Goal & {
  totalProjects: number
  activeProjects: number
  completeProjects: number
}

type Props = {
  projects: (Project & { goal_id: string | null })[]
  events: TimelineEvent[]
  goals: GoalWithProgress[]
  quarterlyBudgets: QuarterlyBudget[]
  grouped: Record<string, Project[]>
  isOwner: boolean
}

const TABS = ['Project Management', 'To-Do', 'Dashboard'] as const
type Tab = typeof TABS[number]

export function NotebookTabs({ projects, goals, quarterlyBudgets, isOwner }: Props) {
  const [tab, setTab] = useState<Tab>('Project Management')

  return (
    <div>
      {/* Tab bar */}
      <div className="border-b border-zinc-200 px-6">
        <div className="max-w-6xl mx-auto flex gap-0">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-600'
              }`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {tab === 'Project Management' && (
          <ProjectManagementTab projects={projects} goals={goals} isOwner={isOwner} />
        )}
        {tab === 'To-Do' && (
          <TodoTab projects={projects} />
        )}
        {tab === 'Dashboard' && (
          <DashboardTab goals={goals} projects={projects} quarters={quarterlyBudgets} isOwner={isOwner} />
        )}
      </div>
    </div>
  )
}
