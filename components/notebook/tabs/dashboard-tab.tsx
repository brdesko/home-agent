'use client'

import { useState } from 'react'
import { type Goal } from '../goals-panel'
import { type Project } from '../project-card'
import { type QuarterlyBudget } from '../budget-tab'
import { GoalsTab } from '../goals-tab'
import { FinancialBudgetTab } from './financial-budget-tab'
import { EffortBudgetTab } from './effort-budget-tab'
import { getRollingQuarters, isBeyond, quarterLabel, fmtCurrency } from '../quarter-utils'

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
  if (risk < 0.4)  return 'text-green-700'
  if (risk < 0.65) return 'text-amber-700'
  if (risk < 0.85) return 'text-orange-700'
  return 'text-red-600'
}

const SUB_TABS = ['Financial Budget', 'Effort Budget'] as const
type SubTab = typeof SUB_TABS[number]

export function DashboardTab({ goals, projects, quarters, isOwner }: Props) {
  const [sub, setSub] = useState<SubTab>('Financial Budget')

  const slots    = getRollingQuarters(4)
  const active   = projects.filter(p => p.status !== 'cancelled')
  const beyondPs = active.filter(p => isBeyond(slots, p.target_year, p.target_quarter))

  type RiskBucket = { label: string; slotPs: typeof projects; budget: number; committed: number; effortScore: number; financialRisk: number; effortRisk: number; combined: number }

  const buckets: RiskBucket[] = [
    ...slots.map(s => {
      const slotPs    = active.filter(p => p.target_year === s.year && p.target_quarter === s.quarter)
      const qRow      = quarters.find(r => r.year === s.year && r.quarter === s.quarter)
      const budget    = qRow ? quarterBudget(qRow) : 0
      const committed = slotPs.reduce((sum, p) => sum + p.budget_lines.filter(b => b.line_type === 'estimated').reduce((s2, b) => s2 + b.amount, 0), 0)
      const effortScore = slotPs.reduce((sum, p) => sum + (EFFORT_SCORE[p.effort ?? ''] ?? 0), 0)
      const financialRisk = budget > 0 ? Math.min(1, committed / budget) : 0
      const effortRisk    = Math.min(1, effortScore / MAX_EFFORT)
      const combined      = (financialRisk * 0.6 + effortRisk * 0.4)
      return { label: quarterLabel(s.year, s.quarter), slotPs, budget, committed, effortScore, financialRisk, effortRisk, combined }
    }),
    (() => {
      const effortScore   = beyondPs.reduce((sum, p) => sum + (EFFORT_SCORE[p.effort ?? ''] ?? 0), 0)
      const committed     = beyondPs.reduce((sum, p) => sum + p.budget_lines.filter(b => b.line_type === 'estimated').reduce((s2, b) => s2 + b.amount, 0), 0)
      const effortRisk    = Math.min(1, effortScore / MAX_EFFORT)
      return { label: 'Beyond 1 Year', slotPs: beyondPs, budget: 0, committed, effortScore, financialRisk: 0, effortRisk, combined: effortRisk * 0.4 }
    })(),
  ]

  return (
    <div className="space-y-10">
      {/* Quarterly risk strip */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Quarterly Risk</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {buckets.map(b => (
            <div key={b.label} className="border border-zinc-200 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-zinc-600">{b.label}</p>
              <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${riskColor(b.combined)}`} style={{ width: `${Math.round(b.combined * 100)}%` }} />
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${riskTextColor(b.combined)}`}>{riskLabel(b.combined)}</span>
                <span className="text-xs text-zinc-400">{b.slotPs.length} project{b.slotPs.length !== 1 ? 's' : ''}</span>
              </div>
              {b.budget > 0 && (
                <p className="text-xs text-zinc-400">
                  {fmtCurrency(b.committed)} / {fmtCurrency(b.budget)}
                </p>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-zinc-400">Risk combines financial exposure (60%) and effort load (40%).</p>
      </section>

      {/* Goals progress */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Goals</h2>
        <GoalsTab goals={goals} projects={projects} />
      </section>

      {/* Budget sub-tabs */}
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
      </section>
    </div>
  )
}
