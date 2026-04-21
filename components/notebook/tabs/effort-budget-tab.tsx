'use client'

import { type Project } from '../project-card'
import { getRollingQuarters, isBeyond, quarterLabel } from '../quarter-utils'

const EFFORT_SCORE: Record<string, number> = { low: 1, medium: 2, high: 3, very_high: 4 }
const EFFORT_LABEL: Record<string, string>  = { low: 'Low', medium: 'Medium', high: 'High', very_high: 'Very high' }

const MAX_EFFORT = 10

function effortChip(score: number): { label: string; barCls: string; textCls: string } {
  if (score === 0)  return { label: 'Open',     barCls: 'bg-zinc-100',    textCls: 'text-zinc-400'  }
  if (score <= 3)   return { label: 'Light',    barCls: 'bg-green-400',   textCls: 'text-green-700' }
  if (score <= 6)   return { label: 'Moderate', barCls: 'bg-amber-400',   textCls: 'text-amber-700' }
  if (score <= 9)   return { label: 'Heavy',    barCls: 'bg-orange-400',  textCls: 'text-orange-700'}
  return                   { label: 'At risk',  barCls: 'bg-red-400',     textCls: 'text-red-600'   }
}

type Props = {
  projects: (Project & { goal_id: string | null })[]
}

export function EffortBudgetTab({ projects }: Props) {
  const slots    = getRollingQuarters(4)
  const active   = projects.filter(p => p.status !== 'cancelled')
  const beyondPs = active.filter(p => isBeyond(slots, p.target_year, p.target_quarter))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {slots.map(s => {
          const slotPs = active.filter(p => p.target_year === s.year && p.target_quarter === s.quarter)
          const score  = slotPs.reduce((sum, p) => sum + (EFFORT_SCORE[p.effort ?? ''] ?? 0), 0)
          const chip   = effortChip(score)
          const pct    = Math.min(100, (score / MAX_EFFORT) * 100)

          return (
            <div key={`${s.year}-${s.quarter}`} className="border border-zinc-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-800">{quarterLabel(s.year, s.quarter)}</span>
                <span className={`text-xs font-medium ${chip.textCls}`}>{chip.label}</span>
              </div>

              <div className="space-y-1">
                <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${chip.barCls}`} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-zinc-400">Score {score} / {MAX_EFFORT}</p>
              </div>

              {slotPs.length > 0 ? (
                <ul className="space-y-1.5 pt-1 border-t border-zinc-100">
                  {slotPs.map(p => (
                    <li key={p.id} className="flex items-center justify-between text-xs">
                      <span className="text-zinc-600">{p.name}</span>
                      <span className="text-zinc-400">{p.effort ? EFFORT_LABEL[p.effort] : 'Unset'}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-zinc-400 italic pt-1 border-t border-zinc-100">Nothing scheduled this quarter.</p>
              )}
            </div>
          )
        })}

        {/* Beyond */}
        {beyondPs.length > 0 && (() => {
          const score = beyondPs.reduce((sum, p) => sum + (EFFORT_SCORE[p.effort ?? ''] ?? 0), 0)
          const chip  = effortChip(score)
          return (
            <div className="border border-dashed border-zinc-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-500">Beyond 1 Year</span>
                <span className={`text-xs font-medium ${chip.textCls}`}>{chip.label}</span>
              </div>
              <ul className="space-y-1.5">
                {beyondPs.map(p => (
                  <li key={p.id} className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">{p.name}</span>
                    <span className="text-zinc-400">{p.effort ? EFFORT_LABEL[p.effort] : 'Unset'}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })()}
      </div>

      <div className="text-xs text-zinc-400 space-y-0.5">
        <p>Effort scores: Low = 1, Medium = 2, High = 3, Very high = 4. Risk threshold at 10 per quarter.</p>
        <p>Ask the Agent to set effort levels or move projects between quarters.</p>
      </div>
    </div>
  )
}
