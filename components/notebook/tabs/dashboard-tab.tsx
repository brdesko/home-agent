'use client'

import { useState } from 'react'
import { type Goal } from '../goals-panel'
import { type Project } from '../project-card'
import { type QuarterlyBudget } from '../budget-tab'
import { FinancialBudgetTab } from './financial-budget-tab'
import { EffortBudgetTab } from './effort-budget-tab'
import { GoalsTab } from '../goals-tab'
import { getRollingQuarters, quarterLabel, fmtCurrency } from '../quarter-utils'

type GoalWithProgress = Goal & {
  totalProjects: number
  activeProjects: number
  completeProjects: number
}

type Props = {
  goals: GoalWithProgress[]
  projects: (Project & { goal_id: string | null })[]
  quarters: QuarterlyBudget[]
  isOwner: boolean
}

const EFFORT_SCORE: Record<string, number> = { low: 1, medium: 2, high: 3, very_high: 4 }
const MAX_EFFORT = 10

function quarterBudget(q: QuarterlyBudget): number {
  const net = q.core_income + q.additional_income - q.core_expenses - q.additional_expenses
  return Math.round(net * q.allocation_pct) / 100
}

function riskColor(risk: number): string {
  if (risk < 0.4)  return 'bg-green-400'
  if (risk < 0.65) return 'bg-amber-400'
  if (risk < 0.85) return 'bg-orange-400'
  return 'bg-red-500'
}

function riskLabel(risk: number): string {
  if (risk < 0.4)  return 'On track'
  if (risk < 0.65) return 'Moderate'
  if (risk < 0.85) return 'Elevated'
  return 'At risk'
}

function riskTextColor(risk: number): string {
  if (risk < 0.4)  return 'oklch(0.48 0.12 155)'
  if (risk < 0.65) return 'oklch(0.52 0.14 75)'
  if (risk < 0.85) return 'oklch(0.52 0.16 50)'
  return 'oklch(0.52 0.20 22)'
}

function riskBg(risk: number): string {
  if (risk < 0.4)  return 'oklch(0.97 0.02 155)'
  if (risk < 0.65) return 'oklch(0.98 0.02 85)'
  if (risk < 0.85) return 'oklch(0.98 0.02 55)'
  return 'oklch(0.98 0.02 22)'
}

function riskBorder(risk: number): string {
  if (risk < 0.4)  return 'oklch(0.85 0.07 155)'
  if (risk < 0.65) return 'oklch(0.85 0.08 85)'
  if (risk < 0.85) return 'oklch(0.85 0.09 55)'
  return 'oklch(0.85 0.10 22)'
}

function riskBarColor(risk: number): string {
  if (risk < 0.4)  return 'oklch(0.60 0.14 155)'
  if (risk < 0.65) return 'oklch(0.72 0.16 85)'
  if (risk < 0.85) return 'oklch(0.68 0.18 50)'
  return 'oklch(0.58 0.22 22)'
}

const SUB_TABS = ['Financial Budget', 'Effort Budget', 'Goals'] as const
type SubTab = typeof SUB_TABS[number]

export function DashboardTab({ goals, projects, quarters, isOwner }: Props) {
  const [sub, setSub] = useState<SubTab>('Financial Budget')

  const slots  = getRollingQuarters(4)
  const active = projects.filter(p => p.status !== 'cancelled')

  const buckets = slots.map(s => {
    const slotPs      = active.filter(p => p.target_year === s.year && p.target_quarter === s.quarter)
    const qRow        = quarters.find(r => r.year === s.year && r.quarter === s.quarter)
    const budget      = qRow ? quarterBudget(qRow) : 0
    const committed   = slotPs.reduce((sum, p) => sum + p.budget_lines.reduce((s2, b) => s2 + (b.estimated_amount ?? 0), 0), 0)
    const effortScore = slotPs.reduce((sum, p) => sum + (EFFORT_SCORE[p.effort ?? ''] ?? 0), 0)
    const financialRisk = budget > 0 ? Math.min(1, committed / budget) : 0
    const effortRisk    = Math.min(1, effortScore / MAX_EFFORT)
    const combined      = financialRisk * 0.6 + effortRisk * 0.4
    return { label: quarterLabel(s.year, s.quarter), slotPs, budget, committed, effortScore, financialRisk, effortRisk, combined }
  })

  return (
    <div className="space-y-10">
      {/* Quarterly risk strip — 4 quarters only */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-600">Quarterly Risk</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {buckets.map(b => (
            <div key={b.label} className="rounded-xl p-4 space-y-3"
              style={{ backgroundColor: riskBg(b.combined), border: `1px solid ${riskBorder(b.combined)}` }}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-zinc-700 leading-tight">{b.label}</p>
                <span className="text-xs text-zinc-400 shrink-0 mt-0.5">{b.slotPs.length} project{b.slotPs.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="h-2.5 bg-white/60 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.round(b.combined * 100)}%`, backgroundColor: riskBarColor(b.combined) }} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold" style={{ color: riskTextColor(b.combined) }}>{riskLabel(b.combined)}</span>
                {b.budget > 0 && (
                  <p className="text-xs text-zinc-500">{fmtCurrency(b.committed)} / {fmtCurrency(b.budget)}</p>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-zinc-400">Risk combines financial exposure (60%) and effort load (40%).</p>
      </section>

      {/* Sub-tabs: Financial Budget | Effort Budget | Goals */}
      <section className="space-y-4">
        <div className="flex gap-0 border-b border-zinc-100">
          {SUB_TABS.map(t => (
            <button key={t} onClick={() => setSub(t)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${sub === t ? 'border-zinc-700 text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}>
              {t}
            </button>
          ))}
        </div>
        {sub === 'Financial Budget' && <FinancialBudgetTab quarters={quarters} projects={projects} isOwner={isOwner} />}
        {sub === 'Effort Budget'    && <EffortBudgetTab projects={projects} />}
        {sub === 'Goals'            && <GoalsTab goals={goals} projects={projects} />}
      </section>
    </div>
  )
}
