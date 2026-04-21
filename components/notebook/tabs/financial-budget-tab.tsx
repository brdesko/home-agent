'use client'

import { useState, useRef } from 'react'
import { type Project } from '../project-card'
import { type QuarterlyBudget } from '../budget-tab'
import { getRollingQuarters, isBeyond, quarterLabel, fmtCurrency } from '../quarter-utils'

type ExpenseItem = { description: string; amount: number }

function quarterBudget(q: QuarterlyBudget): number {
  const net = q.core_income + q.additional_income - q.core_expenses - q.additional_expenses
  return Math.round(net * q.allocation_pct) / 100
}

function projectEstimated(p: Project): number {
  return p.budget_lines.filter(b => b.line_type === 'estimated').reduce((s, b) => s + b.amount, 0)
}

const FIELD_LABELS: { key: keyof QuarterlyBudget; label: string; pct?: boolean }[] = [
  { key: 'core_income',         label: 'Core Income' },
  { key: 'additional_income',   label: 'Additional Income' },
  { key: 'core_expenses',       label: 'Core Expenses' },
  { key: 'additional_expenses', label: 'Additional Expenses' },
  { key: 'allocation_pct',      label: 'Allocation %', pct: true },
]

type Props = {
  quarters: QuarterlyBudget[]
  projects: (Project & { goal_id: string | null })[]
  isOwner: boolean
}

export function FinancialBudgetTab({ quarters: initial, projects, isOwner }: Props) {
  const [rows, setRows] = useState<QuarterlyBudget[]>(initial)
  const [saving, setSaving] = useState<string | null>(null)
  const [expandedCalc, setExpandedCalc] = useState<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const slots    = getRollingQuarters(4)
  const active   = projects.filter(p => p.status !== 'cancelled')
  const beyondPs = active.filter(p => isBeyond(slots, p.target_year, p.target_quarter))

  function getRow(year: number, quarter: number): QuarterlyBudget {
    return rows.find(r => r.year === year && r.quarter === quarter) ?? {
      id: '', year, quarter, core_income: 0, additional_income: 0,
      core_expenses: 0, additional_expenses: 0, additional_expense_items: [], allocation_pct: 0,
    }
  }

  function updateLocal(year: number, quarter: number, patch: Partial<QuarterlyBudget>) {
    setRows(prev => {
      const exists = prev.find(r => r.year === year && r.quarter === quarter)
      if (exists) return prev.map(r => r.year === year && r.quarter === quarter ? { ...r, ...patch } : r)
      return [...prev, { ...getRow(year, quarter), ...patch }]
    })
  }

  async function save(year: number, quarter: number) {
    const row = rows.find(r => r.year === year && r.quarter === quarter) ?? getRow(year, quarter)
    setSaving(`${year}-${quarter}`)
    try {
      const res = await fetch('/api/quarterly-budget', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(row),
      })
      if (res.ok) {
        const saved = await res.json()
        setRows(prev => prev.find(r => r.year === year && r.quarter === quarter)
          ? prev.map(r => r.year === year && r.quarter === quarter ? saved : r)
          : [...prev, saved])
      }
    } finally { setSaving(null) }
  }

  function scheduleAutosave(year: number, quarter: number) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => save(year, quarter), 800)
  }

  function handleChange(year: number, quarter: number, key: keyof QuarterlyBudget, raw: string) {
    const num = parseFloat(raw.replace(/[^0-9.]/g, '')) || 0
    updateLocal(year, quarter, { [key]: num } as Partial<QuarterlyBudget>)
    scheduleAutosave(year, quarter)
  }

  function handleItems(year: number, quarter: number, items: ExpenseItem[]) {
    const total = items.reduce((s, i) => s + (i.amount || 0), 0)
    updateLocal(year, quarter, { additional_expense_items: items, additional_expenses: total })
    scheduleAutosave(year, quarter)
  }

  return (
    <div className="space-y-8">
      {/* Income / expense entry grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left text-xs font-semibold uppercase tracking-widest text-zinc-400 pb-3 pr-6 w-44" />
              {slots.map(s => (
                <th key={`${s.year}-${s.quarter}`} className="text-right text-xs font-semibold text-zinc-500 pb-3 px-3 min-w-[130px]">
                  {quarterLabel(s.year, s.quarter)}
                  {saving === `${s.year}-${s.quarter}` && <span className="ml-1 text-zinc-300 font-normal">saving…</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {FIELD_LABELS.map(({ key, label, pct }) => (
              <tr key={key}>
                <td className="py-2.5 pr-6 text-xs text-zinc-500 font-medium">{label}</td>
                {slots.map(s => {
                  const row = getRow(s.year, s.quarter)
                  const val = row[key] as number
                  const qk  = `${s.year}-${s.quarter}`
                  if (key === 'additional_expenses') return (
                    <td key={qk} className="py-2.5 px-3 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <input disabled={!isOwner} value={val || ''} onChange={e => handleChange(s.year, s.quarter, key, e.target.value)} placeholder="0"
                          className="w-full text-right bg-transparent border-b border-zinc-200 focus:border-zinc-400 focus:outline-none text-zinc-900 py-0.5 disabled:text-zinc-400" />
                        {isOwner && (
                          <button onClick={() => setExpandedCalc(expandedCalc === qk ? null : qk)} className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors">
                            {expandedCalc === qk ? 'hide' : 'breakdown'}
                          </button>
                        )}
                        {expandedCalc === qk && <ExpenseCalculator items={row.additional_expense_items} onChange={items => handleItems(s.year, s.quarter, items)} />}
                      </div>
                    </td>
                  )
                  return (
                    <td key={qk} className="py-2.5 px-3 text-right">
                      <input disabled={!isOwner} value={val || ''} onChange={e => handleChange(s.year, s.quarter, key, e.target.value)} placeholder="0"
                        className="w-full text-right bg-transparent border-b border-zinc-200 focus:border-zinc-400 focus:outline-none text-zinc-900 py-0.5 disabled:text-zinc-400" />
                    </td>
                  )
                })}
              </tr>
            ))}
            <tr className="border-t-2 border-zinc-200">
              <td className="py-3 pr-6 text-xs font-semibold text-zinc-700 uppercase tracking-widest">Available Budget</td>
              {slots.map(s => {
                const b = quarterBudget(getRow(s.year, s.quarter))
                return <td key={`${s.year}-${s.quarter}`} className="py-3 px-3 text-right font-semibold text-zinc-900">{b ? fmtCurrency(b) : <span className="text-zinc-300">—</span>}</td>
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Project commitment by quarter */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Project Commitments</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {slots.map(s => {
            const slotPs   = active.filter(p => p.target_year === s.year && p.target_quarter === s.quarter)
            const budget   = quarterBudget(getRow(s.year, s.quarter))
            const committed = slotPs.reduce((sum, p) => sum + projectEstimated(p), 0)
            const surplus  = budget - committed
            const pct      = budget > 0 ? Math.min(100, (committed / budget) * 100) : 0

            return (
              <div key={`${s.year}-${s.quarter}`} className="border border-zinc-200 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-semibold text-zinc-800">{quarterLabel(s.year, s.quarter)}</span>
                  {budget > 0 && (
                    <span className={`text-xs font-medium ${surplus < 0 ? 'text-red-500' : 'text-zinc-500'}`}>
                      {surplus >= 0 ? `${fmtCurrency(surplus)} left` : `${fmtCurrency(Math.abs(surplus))} over`}
                    </span>
                  )}
                </div>
                {budget > 0 && (
                  <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${surplus < 0 ? 'bg-red-400' : 'bg-blue-400'}`} style={{ width: `${pct}%` }} />
                  </div>
                )}
                {slotPs.length > 0 ? (
                  <ul className="space-y-1">
                    {slotPs.map(p => (
                      <li key={p.id} className="flex items-center justify-between text-xs">
                        <span className="text-zinc-600">{p.name}</span>
                        {projectEstimated(p) > 0 && <span className="text-zinc-400">{fmtCurrency(projectEstimated(p))}</span>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-zinc-300">No projects scheduled</p>
                )}
              </div>
            )
          })}

          {/* Beyond bucket */}
          {beyondPs.length > 0 && (
            <div className="border border-dashed border-zinc-200 rounded-lg p-4 space-y-3">
              <span className="text-sm font-semibold text-zinc-500">Beyond 1 Year</span>
              <ul className="space-y-1">
                {beyondPs.map(p => (
                  <li key={p.id} className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">{p.name}</span>
                    {projectEstimated(p) > 0 && <span className="text-zinc-400">{fmtCurrency(projectEstimated(p))}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      <p className="text-xs text-zinc-400">Fields save automatically. Ask the Agent to move projects between quarters.</p>
    </div>
  )
}

function ExpenseCalculator({ items, onChange }: { items: ExpenseItem[]; onChange: (i: ExpenseItem[]) => void }) {
  return (
    <div className="w-full mt-1 space-y-1 border border-zinc-100 rounded-lg p-2 bg-zinc-50">
      {items.length === 0 && <p className="text-xs text-zinc-400 text-center py-1">No items yet</p>}
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <input value={item.description} onChange={e => onChange(items.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} placeholder="Item" className="flex-1 text-xs bg-white border border-zinc-200 rounded px-2 py-1 focus:outline-none" />
          <input value={item.amount || ''} onChange={e => onChange(items.map((x, j) => j === i ? { ...x, amount: parseFloat(e.target.value) || 0 } : x))} placeholder="$" className="w-16 text-xs text-right bg-white border border-zinc-200 rounded px-2 py-1 focus:outline-none" />
          <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-zinc-300 hover:text-red-400 text-xs">✕</button>
        </div>
      ))}
      <button onClick={() => onChange([...items, { description: '', amount: 0 }])} className="w-full text-xs text-zinc-400 hover:text-zinc-600 pt-1">+ add item</button>
    </div>
  )
}
