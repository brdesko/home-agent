'use client'

import { useState, useRef } from 'react'
import { type Project } from './project-card'

type ExpenseItem = { description: string; amount: number }

export type QuarterlyBudget = {
  id: string
  year: number
  quarter: number
  core_income: number
  additional_income: number
  core_expenses: number
  additional_expenses: number
  additional_expense_items: ExpenseItem[]
  allocation_pct: number
}

type Props = {
  quarters: QuarterlyBudget[]
  projects: (Project & { goal_id: string | null })[]
  isOwner: boolean
}

// ── Shared helpers ────────────────────────────────────────────────────────────

const EFFORT_SCORE: Record<string, number> = { low: 1, medium: 2, high: 3, very_high: 4 }
const EFFORT_LABEL: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High', very_high: 'Very High' }

function quarterBudget(q: QuarterlyBudget): number {
  const net = q.core_income + q.additional_income - q.core_expenses - q.additional_expenses
  return Math.round(net * q.allocation_pct) / 100
}

function estimatedSpend(projects: Project[]): number {
  return projects.reduce((sum, p) =>
    sum + p.budget_lines.filter(b => b.line_type === 'estimated').reduce((s, b) => s + b.amount, 0)
  , 0)
}

function effortScore(projects: Project[]): number {
  return projects.reduce((sum, p) => sum + (EFFORT_SCORE[p.effort ?? ''] ?? 0), 0)
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

function getLastSixQuarters(): { year: number; quarter: number }[] {
  const now = new Date()
  const q   = Math.floor(now.getMonth() / 3) + 1
  const out: { year: number; quarter: number }[] = []
  let cy = now.getFullYear(), cq = q
  for (let i = 0; i < 6; i++) {
    out.unshift({ year: cy, quarter: cq })
    cq--
    if (cq === 0) { cq = 4; cy-- }
  }
  return out
}

// ── Financials sub-tab ────────────────────────────────────────────────────────

const FIELD_LABELS: { key: keyof QuarterlyBudget; label: string; pct?: boolean }[] = [
  { key: 'core_income',         label: 'Core Income' },
  { key: 'additional_income',   label: 'Additional Income' },
  { key: 'core_expenses',       label: 'Core Expenses' },
  { key: 'additional_expenses', label: 'Additional Expenses' },
  { key: 'allocation_pct',      label: 'Allocation %', pct: true },
]

function FinancialsTab({ quarters: initial, isOwner }: { quarters: QuarterlyBudget[]; isOwner: boolean }) {
  const [rows, setRows] = useState<QuarterlyBudget[]>(initial)
  const [saving, setSaving] = useState<string | null>(null)
  const [expandedCalc, setExpandedCalc] = useState<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const slots = getLastSixQuarters()

  function getRow(year: number, quarter: number): QuarterlyBudget {
    return rows.find(r => r.year === year && r.quarter === quarter) ?? {
      id: '', year, quarter,
      core_income: 0, additional_income: 0,
      core_expenses: 0, additional_expenses: 0,
      additional_expense_items: [], allocation_pct: 0,
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
    const key = `${year}-${quarter}`
    setSaving(key)
    try {
      const res = await fetch('/api/quarterly-budget', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(row),
      })
      if (res.ok) {
        const saved = await res.json()
        setRows(prev => {
          const exists = prev.find(r => r.year === year && r.quarter === quarter)
          if (exists) return prev.map(r => r.year === year && r.quarter === quarter ? saved : r)
          return [...prev, saved]
        })
      }
    } finally {
      setSaving(null)
    }
  }

  function scheduleAutosave(year: number, quarter: number) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => save(year, quarter), 800)
  }

  function handleFieldChange(year: number, quarter: number, key: keyof QuarterlyBudget, raw: string) {
    const num = parseFloat(raw.replace(/[^0-9.]/g, '')) || 0
    updateLocal(year, quarter, { [key]: num } as Partial<QuarterlyBudget>)
    scheduleAutosave(year, quarter)
  }

  function handleItemChange(year: number, quarter: number, items: ExpenseItem[]) {
    const total = items.reduce((s, i) => s + (i.amount || 0), 0)
    updateLocal(year, quarter, { additional_expense_items: items, additional_expenses: total })
    scheduleAutosave(year, quarter)
  }

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left text-xs font-semibold uppercase tracking-widest text-zinc-400 pb-3 pr-6 w-40" />
              {slots.map(({ year, quarter }) => (
                <th key={`${year}-${quarter}`} className="text-right text-xs font-semibold text-zinc-500 pb-3 px-3 min-w-[130px]">
                  Q{quarter} {year}
                  {saving === `${year}-${quarter}` && <span className="ml-1 text-zinc-300 font-normal">saving…</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {FIELD_LABELS.map(({ key, label, pct }) => (
              <tr key={key}>
                <td className="py-2.5 pr-6 text-xs text-zinc-500 font-medium">{label}</td>
                {slots.map(({ year, quarter }) => {
                  const row = getRow(year, quarter)
                  const val = row[key] as number
                  const qk  = `${year}-${quarter}`

                  if (key === 'additional_expenses') {
                    return (
                      <td key={qk} className="py-2.5 px-3 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <input
                            disabled={!isOwner}
                            value={val || ''}
                            onChange={e => handleFieldChange(year, quarter, key, e.target.value)}
                            placeholder="0"
                            className="w-full text-right bg-transparent border-b border-zinc-200 focus:border-zinc-400 focus:outline-none text-zinc-900 py-0.5 disabled:text-zinc-400"
                          />
                          {isOwner && (
                            <button onClick={() => setExpandedCalc(expandedCalc === qk ? null : qk)} className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors">
                              {expandedCalc === qk ? 'hide' : 'breakdown'}
                            </button>
                          )}
                          {expandedCalc === qk && (
                            <ExpenseCalculator items={row.additional_expense_items} onChange={items => handleItemChange(year, quarter, items)} />
                          )}
                        </div>
                      </td>
                    )
                  }

                  return (
                    <td key={qk} className="py-2.5 px-3 text-right">
                      <input
                        disabled={!isOwner}
                        value={val || ''}
                        onChange={e => handleFieldChange(year, quarter, key, e.target.value)}
                        placeholder="0"
                        className="w-full text-right bg-transparent border-b border-zinc-200 focus:border-zinc-400 focus:outline-none text-zinc-900 py-0.5 disabled:text-zinc-400"
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
            <tr className="border-t-2 border-zinc-200">
              <td className="py-3 pr-6 text-xs font-semibold text-zinc-700 uppercase tracking-widest">Budget</td>
              {slots.map(({ year, quarter }) => {
                const b = quarterBudget(getRow(year, quarter))
                return (
                  <td key={`${year}-${quarter}`} className="py-3 px-3 text-right font-semibold text-zinc-900">
                    {b !== 0 ? fmt(b) : <span className="text-zinc-300">—</span>}
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-zinc-400">
        Fields save automatically. Budget = (Income − Expenses) × Allocation %. Adjustable via Agent too.
      </p>
    </div>
  )
}

function ExpenseCalculator({ items, onChange }: { items: ExpenseItem[]; onChange: (items: ExpenseItem[]) => void }) {
  function update(i: number, patch: Partial<ExpenseItem>) {
    onChange(items.map((item, idx) => idx === i ? { ...item, ...patch } : item))
  }
  return (
    <div className="w-full mt-1 space-y-1 border border-zinc-100 rounded-lg p-2 bg-zinc-50">
      {items.length === 0 && <p className="text-xs text-zinc-400 text-center py-1">No items yet</p>}
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <input value={item.description} onChange={e => update(i, { description: e.target.value })} placeholder="Item" className="flex-1 text-xs bg-white border border-zinc-200 rounded px-2 py-1 focus:outline-none focus:border-zinc-400" />
          <input value={item.amount || ''} onChange={e => update(i, { amount: parseFloat(e.target.value) || 0 })} placeholder="$" className="w-16 text-xs text-right bg-white border border-zinc-200 rounded px-2 py-1 focus:outline-none focus:border-zinc-400" />
          <button onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="text-zinc-300 hover:text-red-400 transition-colors text-xs">✕</button>
        </div>
      ))}
      <button onClick={() => onChange([...items, { description: '', amount: 0 }])} className="w-full text-xs text-zinc-400 hover:text-zinc-600 transition-colors pt-1">+ add item</button>
    </div>
  )
}

// ── Planning sub-tab ──────────────────────────────────────────────────────────

function effortChip(score: number) {
  if (score === 0) return null
  if (score <= 3)  return { label: 'Light',    cls: 'bg-green-50 text-green-700' }
  if (score <= 6)  return { label: 'Moderate',  cls: 'bg-amber-50 text-amber-700' }
  if (score <= 9)  return { label: 'Heavy',     cls: 'bg-orange-50 text-orange-700' }
  return               { label: 'At risk',   cls: 'bg-red-50 text-red-700' }
}

function PlanningTab({ quarters: budgetRows, projects }: { quarters: QuarterlyBudget[]; projects: (Project & { goal_id: string | null })[] }) {
  const slots = getLastSixQuarters()

  const unscheduled = projects.filter(p => !p.target_year || !p.target_quarter)

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {slots.map(({ year, quarter }) => {
          const slotProjects = projects.filter(p => p.target_year === year && p.target_quarter === quarter)
          const budgetRow    = budgetRows.find(r => r.year === year && r.quarter === quarter)
          const available    = budgetRow ? quarterBudget(budgetRow) : null
          const committed    = estimatedSpend(slotProjects)
          const surplus      = available !== null ? available - committed : null
          const effort       = effortScore(slotProjects)
          const chip         = effortChip(effort)

          return (
            <div key={`${year}-${quarter}`} className="border border-zinc-200 rounded-lg p-4 space-y-3">
              {/* Quarter header */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-800">Q{quarter} {year}</span>
                {chip && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${chip.cls}`}>{chip.label} effort</span>
                )}
              </div>

              {/* Financial bar */}
              <div className="space-y-1">
                {available !== null ? (
                  <>
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>Budget</span>
                      <span className={surplus !== null && surplus < 0 ? 'text-red-500 font-medium' : 'text-zinc-600'}>
                        {surplus !== null
                          ? surplus >= 0
                            ? `${fmt(surplus)} remaining`
                            : `${fmt(Math.abs(surplus))} over`
                          : fmt(available)}
                      </span>
                    </div>
                    {committed > 0 && (
                      <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${surplus !== null && surplus < 0 ? 'bg-red-400' : 'bg-blue-400'}`}
                          style={{ width: `${Math.min(100, available > 0 ? (committed / available) * 100 : 100)}%` }}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-zinc-300">No budget set for this quarter</p>
                )}
              </div>

              {/* Project list */}
              {slotProjects.length > 0 ? (
                <ul className="space-y-1.5 pt-1 border-t border-zinc-100">
                  {slotProjects.map(p => (
                    <li key={p.id} className="flex items-start justify-between gap-2 text-xs">
                      <span className="text-zinc-700 leading-snug">{p.name}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {p.effort && (
                          <span className="text-zinc-400">{EFFORT_LABEL[p.effort]}</span>
                        )}
                        {estimatedSpend([p]) > 0 && (
                          <span className="text-zinc-400">{fmt(estimatedSpend([p]))}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-zinc-300 pt-1 border-t border-zinc-100">No projects scheduled</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Unscheduled projects */}
      {unscheduled.length > 0 && (
        <div className="border border-dashed border-zinc-200 rounded-lg p-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Unscheduled</h3>
          <ul className="space-y-1.5">
            {unscheduled.map(p => (
              <li key={p.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-zinc-600">{p.name}</span>
                <div className="flex items-center gap-2 text-zinc-400">
                  {p.effort && <span>{EFFORT_LABEL[p.effort]}</span>}
                  {estimatedSpend([p]) > 0 && <span>{fmt(estimatedSpend([p]))}</span>}
                </div>
              </li>
            ))}
          </ul>
          <p className="text-xs text-zinc-400">Ask the Agent to assign these to a quarter.</p>
        </div>
      )}
    </div>
  )
}

// ── BudgetTab (outer shell with sub-tabs) ─────────────────────────────────────

const SUB_TABS = ['Financials', 'Planning'] as const
type SubTab = typeof SUB_TABS[number]

export function BudgetTab({ quarters, projects, isOwner }: Props) {
  const [sub, setSub] = useState<SubTab>('Financials')

  return (
    <div className="space-y-6">
      {/* Sub-tab bar */}
      <div className="flex gap-0 border-b border-zinc-100">
        {SUB_TABS.map(t => (
          <button
            key={t}
            onClick={() => setSub(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              sub === t
                ? 'border-zinc-700 text-zinc-900'
                : 'border-transparent text-zinc-400 hover:text-zinc-600'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {sub === 'Financials' && <FinancialsTab quarters={quarters} isOwner={isOwner} />}
      {sub === 'Planning'   && <PlanningTab   quarters={quarters} projects={projects} />}
    </div>
  )
}
