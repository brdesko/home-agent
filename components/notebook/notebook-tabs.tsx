'use client'

import { useState } from 'react'
import { LayoutGrid, CheckSquare, CalendarDays, FolderOpen, TrendingUp } from 'lucide-react'
import { type Project } from './project-card'
import { type TimelineEvent } from './timeline-panel'
import { type Goal } from './goals-panel'
import { type QuarterlyBudget } from './budget-tab'
import { ProjectManagementTab } from './tabs/project-management-tab'
import { TodoTab, type OngoingTask } from './tabs/todo-tab'
import { DashboardTab } from './tabs/dashboard-tab'
import { OverviewTab } from './tabs/overview-tab'
import { CalendarTab, type CalendarEvent } from './tabs/calendar-tab'

const TAB_ICONS = {
  Overview:  LayoutGrid,
  'To-Do':   CheckSquare,
  Calendar:  CalendarDays,
  Projects:  FolderOpen,
  Planning:  TrendingUp,
} as const

type GoalWithProgress = Goal & {
  totalProjects: number
  activeProjects: number
  completeProjects: number
  estimatedSpend: number
  actualSpend: number
}

type Props = {
  projects: (Project & { goal_id: string | null })[]
  events: TimelineEvent[]
  goals: GoalWithProgress[]
  quarterlyBudgets: QuarterlyBudget[]
  ongoingTasks: OngoingTask[]
  calendarEvents: CalendarEvent[]
  grouped: Record<string, Project[]>
  isOwner: boolean
}

const TABS = ['Overview', 'To-Do', 'Calendar', 'Projects', 'Planning'] as const
type Tab = typeof TABS[number]

export function NotebookTabs({ projects, events, goals, quarterlyBudgets: initialBudgets, ongoingTasks, calendarEvents, isOwner }: Props) {
  const [tab, setTab] = useState<Tab>('Overview')
  const [quarterlyBudgets, setQuarterlyBudgets] = useState(initialBudgets)

  return (
    <div>
      {/* Tab bar */}
      <div className="border-b border-zinc-200 px-6">
        <div className="max-w-6xl mx-auto flex gap-0">
          {TABS.map(t => {
            const Icon = TAB_ICONS[t]
            return (
              <button key={t} onClick={() => setTab(t)}
                style={tab === t ? { borderBottomColor: 'var(--sage)' } : {}}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  tab === t ? 'text-zinc-800' : 'border-transparent text-zinc-400 hover:text-zinc-600'
                }`}>
                <Icon className="w-3.5 h-3.5" />
                {t}
              </button>
            )
          })}
        </div>
      </div>

      {tab === 'Calendar' ? (
        <div key="Calendar" className="px-6 py-6 animate-tab-enter">
          <CalendarTab
            initialEvents={calendarEvents}
            timelineEvents={events}
            projects={projects}
            quarterlyBudgets={quarterlyBudgets}
          />
        </div>
      ) : (
        <div key={tab} className="max-w-4xl mx-auto px-6 py-8 animate-tab-enter">
          {tab === 'Overview' && (
            <OverviewTab
              projects={projects}
              events={events}
              goals={goals}
              quarterlyBudgets={quarterlyBudgets}
              ongoingTasks={ongoingTasks}
              onNavigate={(t) => setTab(t as Tab)}
            />
          )}
          {tab === 'To-Do' && (
            <TodoTab projects={projects} goals={goals} ongoingTasks={ongoingTasks} isOwner={isOwner} />
          )}
          {tab === 'Projects' && (
            <ProjectManagementTab projects={projects} goals={goals} isOwner={isOwner} />
          )}
          {tab === 'Planning' && (
            <DashboardTab goals={goals} projects={projects} quarters={quarterlyBudgets} isOwner={isOwner} onQuartersChange={setQuarterlyBudgets} />
          )}
        </div>
      )}
    </div>
  )
}
