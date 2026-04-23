'use client'

import { Info } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { type Project } from '../project-card'
import { type TimelineEvent } from '../timeline-panel'
import { type Goal } from '../goals-panel'
import { type QuarterlyBudget } from '../budget-tab'
import { type OngoingTask } from './todo-tab'
import { getCurrentQuarter, getRollingQuarters, quarterLabel, fmtCurrency } from '../quarter-utils'

const SAGE = 'oklch(0.50 0.10 155)'
const SAGE_HEX = '#4a7c6a'

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
  onNavigate?: (tab: string) => void
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

function fmt(n: number) {
  if (n >= 10000) return `$${Math.round(n / 1000)}k`
  if (n >= 1000)  return `$${(n / 1000).toFixed(1)}k`
  return `$${n}`
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function EmptySlot({ message, sub }: { message: string; sub?: string }) {
  return (
    <div className="py-6 text-center space-y-1">
      <p className="text-sm text-zinc-500">{message}</p>
      {sub && <p className="text-xs text-zinc-400">{sub}</p>}
    </div>
  )
}

function ClickableCard({ children, onClick, className, style }: {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={e => e.key === 'Enter' && onClick?.()}
      className={`${className ?? ''} ${onClick ? 'cursor-pointer hover:brightness-[0.97] transition-all' : ''}`}
      style={style}
    >
      {children}
    </div>
  )
}

export function OverviewTab({ projects, events, goals, quarterlyBudgets, ongoingTasks, onNavigate }: Props) {
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
  const activeCount   = active.filter(p => p.status === 'active').length
  const openTaskCount = active
    .filter(p => p.status === 'active')
    .flatMap(p => p.tasks)
    .filter(t => t.status === 'todo' || t.status === 'in_progress').length

  // Tasks
  const projectTasks = active
    .filter(p => p.status === 'active')
    .flatMap(p =>
      p.tasks
        .filter(t => t.status === 'todo' || t.status === 'in_progress')
        .map(t => ({ id: t.id, title: t.title, projectName: p.name, type: 'project' as const }))
    )
  const ongoingTop = ongoingTasks.map(t => ({ id: t.id, title: t.title, projectName: null, type: 'ongoing' as const }))
  const topTasks = [...projectTasks, ...ongoingTop].slice(0, 5)

  const upcomingEvents = events.slice(0, 3)

  // Onboarding: sparse property detection
  const isSparse = active.length < 3 && !qRow

  function openChatWith(message: string) {
    window.dispatchEvent(new CustomEvent('parcel:open-chat', { detail: { message } }))
  }

  // Chart data — rolling 4 quarters budget vs committed
  const chartSlots = getRollingQuarters(4)
  const chartData = chartSlots.map(s => {
    const row       = quarterlyBudgets.find(r => r.year === s.year && r.quarter === s.quarter)
    const alloc     = row ? qBudget(row) : 0
    const slotCommit = active
      .filter(p => p.target_year === s.year && p.target_quarter === s.quarter)
      .reduce((sum, p) => sum + p.budget_lines.reduce((a, b) => a + (b.estimated_amount ?? 0), 0), 0)
    return { label: `Q${s.quarter} ${s.year}`, allocated: alloc, committed: slotCommit }
  })
  const hasChartData = chartData.some(d => d.allocated > 0 || d.committed > 0)

  return (
    <div className="space-y-8">

      {/* Greeting */}
      {!isSparse && (
        <div className="space-y-0.5">
          <p className="text-xl font-display" style={{ color: 'oklch(0.38 0.015 75)' }}>{getGreeting()}.</p>
          <p className="text-sm" style={{ color: 'oklch(0.60 0.012 75)' }}>
            {activeCount > 0
              ? `${activeCount} active project${activeCount !== 1 ? 's' : ''}`
              : 'No active projects'}
            {openTaskCount > 0 ? ` · ${openTaskCount} open task${openTaskCount !== 1 ? 's' : ''}` : ''}
            {budget > 0 ? ` · ${budget >= 1000 ? `$${Math.round(budget / 1000)}k` : fmtCurrency(budget)} in Q${quarter}` : ''}
          </p>
        </div>
      )}

      {/* Onboarding banner */}
      {isSparse && (
        <div className="rounded-xl overflow-hidden"
          style={{ background: 'linear-gradient(135deg, oklch(0.97 0.03 155), oklch(0.99 0.01 85))', border: '1px solid oklch(0.88 0.06 155)' }}>

          {/* What Parcel is */}
          <div className="px-5 pt-5 pb-4 space-y-2 border-b" style={{ borderColor: 'oklch(0.88 0.06 155)' }}>
            <p className="text-base font-semibold text-zinc-800 leading-snug">Welcome to Parcel.</p>
            <p className="text-sm leading-relaxed" style={{ color: 'oklch(0.48 0.015 75)' }}>
              Parcel is your property&apos;s notebook and thinking partner. Track projects, budgets, and timelines in one place — then talk to your Agent to plan what&apos;s next, work through tradeoffs, or just think out loud about your home.
            </p>
            <button
              onClick={() => openChatWith("Can you give me a quick walkthrough of what Parcel can do? I'm just getting started and want to understand how to use it well.")}
              className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors mt-1"
              style={{ color: SAGE }}
            >
              Ask the Agent for a walkthrough →
            </button>
          </div>

          {/* Setup steps */}
          <div className="px-5 py-4 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'oklch(0.58 0.08 155)' }}>Get started</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => openChatWith("I just set up a new property and want to get started. Here's my Zillow or Redfin listing — can you help me parse it and understand what I have?")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 border border-zinc-200 text-zinc-600 hover:bg-white/90 transition-colors text-xs text-left"
              >
                <span style={{ color: SAGE }}>①</span> Share your property listing
              </button>
              <button
                onClick={() => openChatWith("I want to set my first goals for this property. Can you help me think through what goals make sense for a new homeowner?")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 border border-zinc-200 text-zinc-600 hover:bg-white/90 transition-colors text-xs text-left"
              >
                <span style={{ color: SAGE }}>②</span> Set your first goals
              </button>
              <button
                onClick={() => openChatWith("I need to set my first quarterly budget for this property. Can you help me figure out what income, expenses, and home improvement allocation makes sense?")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 border border-zinc-200 text-zinc-600 hover:bg-white/90 transition-colors text-xs text-left"
              >
                <span style={{ color: SAGE }}>③</span> Set a quarterly budget
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Row 1: risk card + vitals — all clickable */}
      <div className="grid grid-cols-4 gap-4 items-stretch">

        <ClickableCard
          onClick={() => onNavigate?.('Planning')}
          className="rounded-xl p-5 space-y-3 flex flex-col"
          style={{ backgroundColor: riskBg(combined), border: `1px solid ${riskBorder(combined)}` }}
        >
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{quarterLabel(year, quarter)}</p>
              <div className="relative group">
                <Info className="w-3 h-3 cursor-help" style={{ color: 'oklch(0.65 0 0)' }} />
                <div className="absolute bottom-full left-0 mb-2 w-52 p-2.5 rounded-lg text-xs leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-lg"
                  style={{ backgroundColor: 'oklch(0.18 0.012 80)', color: 'oklch(1 0 0 / 0.75)' }}>
                  Risk blends financial exposure (60%) and effort load (40%). Green &lt;40%, amber &lt;65%, orange &lt;85%, red above.
                </div>
              </div>
            </div>
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
        </ClickableCard>

        <ClickableCard
          onClick={() => onNavigate?.('Projects')}
          className="rounded-xl border border-zinc-100 bg-white p-5 flex flex-col justify-between"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Active Projects</p>
          <p className="text-4xl font-display text-zinc-700 mt-2 leading-none">{activeCount}</p>
        </ClickableCard>

        <ClickableCard
          onClick={() => onNavigate?.('To-Do')}
          className="rounded-xl border border-zinc-100 bg-white p-5 flex flex-col justify-between"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Open Tasks</p>
          <p className="text-4xl font-display text-zinc-700 mt-2 leading-none">{openTaskCount}</p>
        </ClickableCard>

        <ClickableCard
          onClick={() => onNavigate?.('Planning')}
          className="rounded-xl border border-zinc-100 bg-white p-5 flex flex-col justify-between"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Q Budget</p>
          <p className="text-3xl font-display text-zinc-700 mt-2 leading-none">
            {budget > 0 ? (budget >= 1000 ? `$${Math.round(budget / 1000)}k` : fmtCurrency(budget)) : '—'}
          </p>
        </ClickableCard>
      </div>

      {/* Chart — budget vs committed by quarter */}
      {hasChartData && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-600">Budget vs. Committed</h2>
          <div className="rounded-xl border border-zinc-100 bg-white p-5">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} barCategoryGap="30%" barGap={3}>
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={fmt}
                  tick={{ fontSize: 10, fill: '#a1a1aa' }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                />
                <Tooltip
                  formatter={(val, name) => [fmtCurrency(Number(val ?? 0)), name === 'allocated' ? 'Allocated' : 'Committed']}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e4e4e7', boxShadow: 'none' }}
                  cursor={{ fill: 'oklch(0.97 0 0)' }}
                />
                <Bar dataKey="allocated" radius={[3, 3, 0, 0]} maxBarSize={32}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={SAGE_HEX} fillOpacity={0.25} />
                  ))}
                </Bar>
                <Bar dataKey="committed" radius={[3, 3, 0, 0]} maxBarSize={32}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.committed > entry.allocated && entry.allocated > 0 ? '#f87171' : SAGE_HEX} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 pt-1 justify-end">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: SAGE_HEX, opacity: 0.25 }} />
                <span className="text-[10px] text-zinc-400">Allocated</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: SAGE_HEX, opacity: 0.85 }} />
                <span className="text-[10px] text-zinc-400">Committed</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Row 2: tasks + events */}
      <div className="grid grid-cols-2 gap-6">
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-600">Up Next</h2>
          {topTasks.length === 0 ? (
            <EmptySlot message="All clear." sub="No open tasks right now." />
          ) : (
            <ul className="space-y-2">
              {topTasks.map(t => (
                <li key={t.id} className="flex items-start gap-2.5 py-2 border-b border-zinc-100 last:border-0">
                  <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: SAGE }} />
                  <div className="min-w-0">
                    <p className="text-sm text-zinc-700 leading-snug">{t.title}</p>
                    {t.projectName && <p className="text-xs text-zinc-400 mt-0.5">{t.projectName}</p>}
                    {t.type === 'ongoing' && <p className="text-xs text-zinc-400 mt-0.5">Ongoing</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-600">Upcoming</h2>
          {upcomingEvents.length === 0 ? (
            <EmptySlot message="Nothing scheduled." sub="Add events on the Calendar tab." />
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

      {/* Goals */}
      {goals.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-600">Goals</h2>
          <div className="space-y-3">
            {goals.map(g => {
              const pct = g.totalProjects > 0 ? g.completeProjects / g.totalProjects : 0
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
                    {g.completeProjects} of {g.totalProjects} project{g.totalProjects !== 1 ? 's' : ''} done
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
