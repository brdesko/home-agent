'use client'

import { type Project } from '../project-card'
import { type TimelineEvent } from '../timeline-panel'
import { type Goal } from '../goals-panel'
import { type QuarterlyBudget } from '../budget-tab'
import { type OngoingTask } from './todo-tab'
import { getCurrentQuarter, quarterLabel, fmtCurrency } from '../quarter-utils'

const SAGE = 'oklch(0.50 0.10 155)'
const EFFORT_SCORE: Record<string, number> = { low: 1, medium: 2, high: 3, very_high: 4 }
const MAX_EFFORT = 10

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
}

function qBudget(q: QuarterlyBudget): number {
  const net = q.core_income + q.additional_income - q.core_expenses - q.additional_expenses
  return Math.round(net * q.allocation_pct) / 100
}

function riskLabel(r: number) {
  if (r < 0.4)  return 'On track'
  if (r < 0.65) return 'Moderate'
  if (r < 0.85) return 'Elevated'
  return 'At risk'
}
function riskBg(r: number) {
  if (r < 0.4)  return 'oklch(0.97 0.02 155)'
  if (r < 0.65) return 'oklch(0.98 0.02 85)'
  if (r < 0.85) return 'oklch(0.98 0.02 55)'
  return 'oklch(0.98 0.02 22)'
}
function riskBorder(r: number) {
  if (r < 0.4)  return 'oklch(0.85 0.07 155)'
  if (r < 0.65) return 'oklch(0.85 0.08 85)'
  if (r < 0.85) return 'oklch(0.85 0.09 55)'
  return 'oklch(0.85 0.10 22)'
}
function riskBarColor(r: number) {
  if (r < 0.4)  return 'oklch(0.60 0.14 155)'
  if (r < 0.65) return 'oklch(0.72 0.16 85)'
  if (r < 0.85) return 'oklch(0.68 0.18 50)'
  return 'oklch(0.58 0.22 22)'
}
function riskTextColor(r: number) {
  if (r < 0.4)  return 'oklch(0.48 0.12 155)'
  if (r < 0.65) return 'oklch(0.52 0.14 75)'
  if (r < 0.85) return 'oklch(0.52 0.16 50)'
  return 'oklch(0.52 0.20 22)'
}

function shortDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function OverviewTab({ projects, events, goals, quarterlyBudgets, ongoingTasks }: Props) {
  const { year, quarter } = getCurrentQuarter()
  const active = projects.filter(p => p.status !== 'cancelled')

  // Current-quarter risk
  const slotPs      = active.filter(p => p.target_year === year && p.target_quarter === quarter)
  const qRow        = quarterlyBudgets.find(r => r.year === year && r.quarter === quarter)
  const budget      = qRow ? qBudget(qRow) : 0
  const committed   = slotPs.reduce((sum, p) => sum + p.budget_lines.reduce((s, b) => s + (b.estimated_amount ?? 0), 0), 0)
  const effortScore = slotPs.reduce((sum, p) => sum + (EFFORT_SCORE[p.effort ?? ''] ?? 0), 0)
  const finRisk     = budget > 0 ? Math.min(1, committed / budget) : 0
  const effRisk     = Math.min(1, effortScore / MAX_EFFORT)
  const combined    = finRisk * 0.6 + effRisk * 0.4

  // Vitals
  const activeCount = active.filter(p => p.status === 'active').length
  const openTaskCount = active
    .filter(p => p.status === 'active')
    .flatMap(p => p.tasks)
    .filter(t => t.status === 'todo' || t.status === 'in_progress').length

  // Top 5 open tasks — project tasks first, then ongoing
  const projectTasks = active
    .filter(p => p.status === 'active')
    .flatMap(p =>
      p.tasks
        .filter(t => t.status === 'todo' || t.status === 'in_progress')
        .map(t => ({ id: t.id, title: t.title, projectName: p.name, type: 'project' as const }))
    )
  const ongoingTop = ongoingTasks
    .map(t => ({ id: t.id, title: t.title, projectName: null, type: 'ongoing' as const }))
  const topTasks = [...projectTasks, ...ongoingTop].slice(0, 5)

  // Next 3 events
  const upcomingEvents = events.slice(0, 3)

  return (
    <div className="space-y-8">

      {/* Row 1: risk card + vitals */}
      <div className="grid grid-cols-4 gap-4 items-stretch">

        {/* Risk card */}
        <div className="rounded-xl p-5 space-y-3 flex flex-col"
          style={{ backgroundColor: riskBg(combined), border: `1px solid ${riskBorder(combined)}` }}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{quarterLabel(year, quarter)}</p>
            <p className="text-lg font-semibold mt-1" style={{ color: riskTextColor(combined) }}>
              {riskLabel(combined)}
            </p>
          </div>
          <div className="h-2 bg-white/60 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${Math.round(combined * 100)}%`, backgroundColor: riskBarColor(combined) }} />
          </div>
          <p className="text-xs text-zinc-500 mt-auto">
            {slotPs.length} project{slotPs.length !== 1 ? 's' : ''}
            {budget > 0 ? ` · ${fmtCurrency(committed)} / ${fmtCurrency(budget)}` : ''}
          </p>
        </div>

        {/* Vital cards */}
        <div className="rounded-xl border border-zinc-100 bg-white p-5 flex flex-col justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Active Projects</p>
          <p className="text-4xl font-display text-zinc-700 mt-2 leading-none">{activeCount}</p>
        </div>

        <div className="rounded-xl border border-zinc-100 bg-white p-5 flex flex-col justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Open Tasks</p>
          <p className="text-4xl font-display text-zinc-700 mt-2 leading-none">{openTaskCount}</p>
        </div>

        <div className="rounded-xl border border-zinc-100 bg-white p-5 flex flex-col justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Q Budget</p>
          <p className="text-3xl font-display text-zinc-700 mt-2 leading-none">
            {budget > 0 ? (budget >= 1000 ? `$${Math.round(budget / 1000)}k` : fmtCurrency(budget)) : '—'}
          </p>
        </div>
      </div>

      {/* Row 2: tasks + events */}
      <div className="grid grid-cols-2 gap-6">

        {/* Immediate to-dos */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-600">Up Next</h2>
          {topTasks.length === 0 ? (
            <p className="text-sm text-zinc-400">No open tasks. You're ahead of schedule.</p>
          ) : (
            <ul className="space-y-2">
              {topTasks.map(t => (
                <li key={t.id} className="flex items-start gap-2.5 py-2 border-b border-zinc-100 last:border-0">
                  <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: SAGE }} />
                  <div className="min-w-0">
                    <p className="text-sm text-zinc-700 leading-snug">{t.title}</p>
                    {t.projectName && (
                      <p className="text-xs text-zinc-400 mt-0.5">{t.projectName}</p>
                    )}
                    {t.type === 'ongoing' && (
                      <p className="text-xs text-zinc-400 mt-0.5">Ongoing</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Upcoming timeline events */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-600">Upcoming</h2>
          {upcomingEvents.length === 0 ? (
            <p className="text-sm text-zinc-400">No upcoming events.</p>
          ) : (
            <ul className="space-y-2">
              {upcomingEvents.map(e => (
                <li key={e.id} className="flex items-start gap-3 py-2 border-b border-zinc-100 last:border-0">
                  <span className="text-xs text-zinc-400 tabular-nums w-14 shrink-0 mt-0.5">{shortDate(e.event_date)}</span>
                  <p className="text-sm text-zinc-700 leading-snug">{e.title}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Row 3: Goals */}
      {goals.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-600">Goals</h2>
          <div className="space-y-3">
            {goals.map(g => {
              const total    = g.totalProjects
              const complete = g.completeProjects
              const pct      = total > 0 ? complete / total : 0
              return (
                <div key={g.id} className="flex items-center gap-4">
                  <div className="w-40 shrink-0">
                    <p className="text-sm text-zinc-700 leading-snug truncate">{g.name}</p>
                  </div>
                  <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.round(pct * 100)}%`, backgroundColor: SAGE }} />
                  </div>
                  <p className="text-xs text-zinc-400 w-28 shrink-0 text-right">
                    {complete} of {total} project{total !== 1 ? 's' : ''} done
                  </p>
                </div>
              )
            })}
          </div>
        </section>
      )}

    </div>
  )
}
