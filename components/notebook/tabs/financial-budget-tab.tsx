'use client'

import { useState, useRef, useEffect } from 'react'
import { Bot, X, Send } from 'lucide-react'
import { type Project } from '../project-card'
import { type QuarterlyBudget } from '../budget-tab'
import { getRollingQuarters, isBeyond, quarterLabel, fmtCurrency } from '../quarter-utils'

const SAGE = 'oklch(0.50 0.10 155)'

type ExpenseItem = { description: string; amount: number }

function quarterBudget(q: QuarterlyBudget): number {
  const net = q.core_income + q.additional_income - q.core_expenses - q.additional_expenses
  return Math.round(net * q.allocation_pct) / 100
}

function projectEstimated(p: Project): number {
  return p.budget_lines.reduce((s, b) => s + (b.estimated_amount ?? 0), 0)
}

const FIELD_LABELS: { key: keyof QuarterlyBudget; label: string }[] = [
  { key: 'core_income',         label: 'Core Income' },
  { key: 'additional_income',   label: 'Additional Income' },
  { key: 'core_expenses',       label: 'Core Expenses' },
  { key: 'additional_expenses', label: 'Additional Expenses' },
  { key: 'allocation_pct',      label: 'Allocation %' },
]

type AgentMessage = { role: 'user' | 'assistant'; content: string }
type AgentSuggestions = Record<string, Record<string, number>>

type Props = {
  quarters: QuarterlyBudget[]
  projects: (Project & { goal_id: string | null })[]
  isOwner: boolean
}

export function FinancialBudgetTab({ quarters: initial, projects, isOwner }: Props) {
  const [rows, setRows] = useState<QuarterlyBudget[]>(initial)
  const [saving, setSaving] = useState<string | null>(null)
  const [expandedCalc, setExpandedCalc] = useState<string | null>(null)
  const [localInputs, setLocalInputs] = useState<Record<string, string>>({})

  // Agent chat state
  const [agentOpen, setAgentOpen] = useState(false)
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([])
  const [agentLoading, setAgentLoading] = useState(false)
  const [agentDraft, setAgentDraft] = useState('')
  const [agentSuggestions, setAgentSuggestions] = useState<AgentSuggestions | null>(null)
  const [appliedKeys, setAppliedKeys] = useState<Set<string>>(new Set())
  const chatEndRef = useRef<HTMLDivElement>(null)
  const agentInitialized = useRef(false)

  const slots    = getRollingQuarters(4)
  const active   = projects.filter(p => p.status !== 'cancelled')
  const beyondPs = active.filter(p => isBeyond(slots, p.target_year, p.target_quarter))

  // Quarter-start nudge: find the first upcoming quarter with no budget within 30 days
  const nudgeQuarter = (() => {
    const today = new Date()
    for (const s of slots) {
      const qStart = new Date(s.year, (s.quarter - 1) * 3, 1)
      const daysUntil = Math.ceil((qStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      if (daysUntil > 0 && daysUntil <= 30) {
        const row = rows.find(r => r.year === s.year && r.quarter === s.quarter)
        const hasData = row && (row.core_income > 0 || row.core_expenses > 0)
        if (!hasData) return { label: quarterLabel(s.year, s.quarter), days: daysUntil }
      }
    }
    return null
  })()

  useEffect(() => {
    if (agentOpen && !agentInitialized.current) {
      agentInitialized.current = true
      callAgent([])
    }
  }, [agentOpen])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [agentMessages, agentLoading])

  async function callAgent(messages: AgentMessage[]) {
    setAgentLoading(true)
    try {
      const res = await fetch('/api/agent/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quarterlyBudgets: rows, messages }),
      })
      const data = await res.json()
      setAgentMessages(prev => [...prev, { role: 'assistant', content: data.message }])
      if (data.suggestions) setAgentSuggestions(data.suggestions)
    } finally {
      setAgentLoading(false)
    }
  }

  async function sendAgentMessage() {
    const text = agentDraft.trim()
    if (!text || agentLoading) return
    const userMsg: AgentMessage = { role: 'user', content: text }
    const next = [...agentMessages, userMsg]
    setAgentMessages(next)
    setAgentDraft('')
    await callAgent(next)
  }

  function applyBudgetSuggestions(qKey: string, vals: Record<string, number>) {
    const [year, quarter] = qKey.split('-').map(Number)
    updateLocal(year, quarter, vals as Partial<QuarterlyBudget>)
    save(year, quarter, vals as Partial<QuarterlyBudget>)
    setAppliedKeys(prev => new Set(prev).add(qKey))
  }

  function openAgent() {
    setAgentOpen(true)
  }

  function closeAgent() {
    setAgentOpen(false)
    setAgentMessages([])
    setAgentSuggestions(null)
    setAppliedKeys(new Set())
    agentInitialized.current = false
  }

  // ── Budget data helpers ──────────────────────────────────────────────────────

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

  async function save(year: number, quarter: number, overridePatch?: Partial<QuarterlyBudget>) {
    const base = rows.find(r => r.year === year && r.quarter === quarter) ?? getRow(year, quarter)
    const row = overridePatch ? { ...base, ...overridePatch } : base
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

  function inputKey(year: number, quarter: number, key: keyof QuarterlyBudget) {
    return `${year}-${quarter}-${key}`
  }

  function handleFocus(year: number, quarter: number, key: keyof QuarterlyBudget) {
    const val = getRow(year, quarter)[key] as number
    setLocalInputs(prev => ({ ...prev, [inputKey(year, quarter, key)]: val ? String(val) : '' }))
  }

  function handleChange(year: number, quarter: number, key: keyof QuarterlyBudget, raw: string) {
    setLocalInputs(prev => ({ ...prev, [inputKey(year, quarter, key)]: raw }))
  }

  function handleBlur(year: number, quarter: number, key: keyof QuarterlyBudget) {
    const ik = inputKey(year, quarter, key)
    const raw = localInputs[ik] ?? ''
    const num = parseFloat(raw.replace(/[^0-9.]/g, '')) || 0
    setLocalInputs(prev => { const next = { ...prev }; delete next[ik]; return next })
    updateLocal(year, quarter, { [key]: num } as Partial<QuarterlyBudget>)
    save(year, quarter)
  }

  function handleItems(year: number, quarter: number, items: ExpenseItem[]) {
    const total = items.reduce((s, i) => s + (i.amount || 0), 0)
    updateLocal(year, quarter, { additional_expense_items: items, additional_expenses: total })
    save(year, quarter)
  }

  function displayValue(year: number, quarter: number, key: keyof QuarterlyBudget): string {
    const ik = inputKey(year, quarter, key)
    if (ik in localInputs) return localInputs[ik]
    const val = getRow(year, quarter)[key] as number
    return val ? String(val) : ''
  }

  const FIELD_PRETTY: Partial<Record<keyof QuarterlyBudget, string>> = {
    core_income: 'Core Income', additional_income: 'Addl. Income',
    core_expenses: 'Core Expenses', additional_expenses: 'Addl. Expenses',
    allocation_pct: 'Allocation %',
  }

  return (
    <div className="space-y-6">

      {/* Quarter-start nudge */}
      {isOwner && nudgeQuarter && (
        <div className="flex items-center justify-between gap-4 rounded-lg px-4 py-3 text-sm"
          style={{ backgroundColor: 'oklch(0.97 0.03 75)', border: '1px solid oklch(0.88 0.08 75)' }}>
          <span style={{ color: 'oklch(0.45 0.12 75)' }}>
            <span className="font-semibold">{nudgeQuarter.label}</span> starts in {nudgeQuarter.days} day{nudgeQuarter.days !== 1 ? 's' : ''} — no budget set yet.
          </span>
          <button
            onClick={openAgent}
            className="text-xs font-semibold whitespace-nowrap px-2.5 py-1 rounded-lg transition-colors text-white"
            style={{ backgroundColor: 'oklch(0.60 0.12 75)' }}
          >
            Ask Agent →
          </button>
        </div>
      )}

      {/* Income / expense entry grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left text-xs font-semibold uppercase tracking-widest text-zinc-600 pb-3 pr-6 w-44" />
              {slots.map(s => (
                <th key={`${s.year}-${s.quarter}`} className="text-right text-xs font-semibold text-zinc-500 pb-3 px-3 min-w-[130px]">
                  {quarterLabel(s.year, s.quarter)}
                  {saving === `${s.year}-${s.quarter}` && <span className="ml-1 text-zinc-300 font-normal">saving…</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {FIELD_LABELS.map(({ key, label }) => (
              <tr key={key}>
                <td className="py-2.5 pr-6 text-xs text-zinc-500 font-medium">{label}</td>
                {slots.map(s => {
                  const qk = `${s.year}-${s.quarter}`
                  if (key === 'additional_expenses') return (
                    <td key={qk} className="py-2.5 px-3 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <input
                          disabled={!isOwner}
                          value={displayValue(s.year, s.quarter, key)}
                          onFocus={() => handleFocus(s.year, s.quarter, key)}
                          onChange={e => handleChange(s.year, s.quarter, key, e.target.value)}
                          onBlur={() => handleBlur(s.year, s.quarter, key)}
                          placeholder="0"
                          style={{ color: 'oklch(0.58 0.012 75)' }}
                          className="w-full text-right bg-transparent border-b border-zinc-200 focus:border-zinc-400 focus:outline-none py-0.5 disabled:text-zinc-400"
                        />
                        {isOwner && (
                          <button onClick={() => setExpandedCalc(expandedCalc === qk ? null : qk)} className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors">
                            {expandedCalc === qk ? 'hide' : 'breakdown'}
                          </button>
                        )}
                        {expandedCalc === qk && <ExpenseCalculator items={getRow(s.year, s.quarter).additional_expense_items} onChange={items => handleItems(s.year, s.quarter, items)} />}
                      </div>
                    </td>
                  )
                  return (
                    <td key={qk} className="py-2.5 px-3 text-right">
                      <input
                        disabled={!isOwner}
                        value={displayValue(s.year, s.quarter, key)}
                        onFocus={() => handleFocus(s.year, s.quarter, key)}
                        onChange={e => handleChange(s.year, s.quarter, key, e.target.value)}
                        onBlur={() => handleBlur(s.year, s.quarter, key)}
                        placeholder="0"
                        style={{ color: 'oklch(0.58 0.012 75)' }}
                        className="w-full text-right bg-transparent border-b border-zinc-200 focus:border-zinc-400 focus:outline-none py-0.5 disabled:text-zinc-400"
                      />
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

      {/* Agent help button */}
      {isOwner && !agentOpen && (
        <button
          onClick={openAgent}
          className="flex items-center gap-1.5 text-xs font-medium transition-colors"
          style={{ color: SAGE }}
        >
          <Bot className="w-3.5 h-3.5" />
          Ask Agent for help filling these in
        </button>
      )}

      {/* Inline agent chat panel */}
      {agentOpen && (
        <div className="border border-zinc-200 rounded-xl overflow-hidden">
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 bg-zinc-50">
            <div className="flex items-center gap-2">
              <Bot className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">Agent · Budget Advisor</span>
            </div>
            <button onClick={closeAgent} className="text-zinc-400 hover:text-zinc-600 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Messages */}
          <div className="px-4 py-4 space-y-3 max-h-72 overflow-y-auto bg-white">
            {agentMessages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>
                {m.role === 'assistant' && (
                  <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wide mb-1">Agent</p>
                )}
                <div className={`text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-zinc-100 text-zinc-700 px-3 py-2 rounded-xl rounded-tr-sm max-w-[80%] text-right'
                    : 'text-zinc-700'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {agentLoading && (
              <p className="text-xs text-zinc-400 italic">Agent is thinking…</p>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Suggestions card */}
          {agentSuggestions && Object.keys(agentSuggestions).length > 0 && (
            <div className="px-4 py-3 border-t border-zinc-100 bg-zinc-50 space-y-2">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Suggested values</p>
              {Object.entries(agentSuggestions).map(([qKey, vals]) => {
                const [yr, qr] = qKey.split('-').map(Number)
                const applied = appliedKeys.has(qKey)
                return (
                  <div key={qKey} className="flex items-start justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2.5">
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-zinc-700">{quarterLabel(yr, qr)}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                        {Object.entries(vals).map(([field, val]) => (
                          <span key={field} className="text-xs text-zinc-500">
                            {FIELD_PRETTY[field as keyof QuarterlyBudget] ?? field}: <span className="text-zinc-800 font-medium">{field === 'allocation_pct' ? `${val}%` : fmtCurrency(val)}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                    {applied ? (
                      <span className="text-xs text-green-600 font-medium shrink-0 mt-0.5">Applied ✓</span>
                    ) : (
                      <button
                        onClick={() => applyBudgetSuggestions(qKey, vals)}
                        className="text-xs font-semibold text-white px-2.5 py-1 rounded-lg shrink-0 transition-colors"
                        style={{ backgroundColor: SAGE }}
                      >
                        Apply
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Input */}
          <div className="flex gap-2 px-4 py-3 border-t border-zinc-100 bg-white">
            <input
              type="text"
              value={agentDraft}
              onChange={e => setAgentDraft(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendAgentMessage()}
              placeholder="Reply to Agent…"
              disabled={agentLoading}
              className="flex-1 text-sm border border-zinc-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-zinc-400 disabled:opacity-50"
            />
            <button
              onClick={sendAgentMessage}
              disabled={!agentDraft.trim() || agentLoading}
              className="p-2 rounded-lg text-white disabled:opacity-40 transition-colors"
              style={{ backgroundColor: SAGE }}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Project commitment by quarter */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-600">Project Commitments</h3>
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
                    <div className={`h-full rounded-full ${surplus < 0 ? 'bg-red-400' : ''}`} style={{ width: `${pct}%`, backgroundColor: surplus < 0 ? undefined : 'var(--sage)' }} />
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
                  <p className="text-xs text-zinc-400 italic">Nothing scheduled this quarter.</p>
                )}
              </div>
            )
          })}

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
      <p className="text-xs text-zinc-400">Values save when you leave a field. Update manually or chat with your Agent about what makes sense.</p>
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
