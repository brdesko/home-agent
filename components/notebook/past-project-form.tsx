'use client'

import { useEffect, useState } from 'react'
import { type Goal } from './goals-panel'

const DOMAINS = [
  { value: 'renovation',   label: 'Renovation' },
  { value: 'farm',         label: 'Farm' },
  { value: 'grounds',      label: 'Grounds' },
  { value: 'maintenance',  label: 'Maintenance' },
  { value: 'home-systems', label: 'Home Systems' },
]

const PRIORITIES = [
  { value: 'high',   label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low',    label: 'Low' },
]

const EFFORTS = [
  { value: 'low',       label: 'Low — mostly hired out' },
  { value: 'medium',    label: 'Medium — some coordination' },
  { value: 'high',      label: 'High — hands-on work' },
  { value: 'very_high', label: 'Very high — intensive DIY' },
]

const QUARTERS = [
  { value: 1, label: 'Q1 (Jan–Mar)' },
  { value: 2, label: 'Q2 (Apr–Jun)' },
  { value: 3, label: 'Q3 (Jul–Sep)' },
  { value: 4, label: 'Q4 (Oct–Dec)' },
]

const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 15 }, (_, i) => currentYear - i)

type Props = {
  goals: Goal[]
  onClose: () => void
  onCreated: (project: Record<string, unknown>) => void
}

export function PastProjectForm({ goals, onClose, onCreated }: Props) {
  const [name,        setName]        = useState('')
  const [domain,      setDomain]      = useState('renovation')
  const [customDomain, setCustom]     = useState('')
  const [description, setDescription] = useState('')
  const [priority,    setPriority]    = useState('medium')
  const [effort,      setEffort]      = useState('')
  const [year,        setYear]        = useState(currentYear)
  const [quarter,     setQuarter]     = useState<number | ''>('')
  const [actualSpend, setActualSpend] = useState('')
  const [goalId,      setGoalId]      = useState('')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function submit() {
    const finalName   = name.trim()
    const finalDomain = domain === '__custom__' ? customDomain.trim() : domain
    if (!finalName || !finalDomain) { setError('Name and domain are required.'); return }

    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:           finalName,
          domain:         finalDomain,
          status:         'complete',
          priority,
          effort:         effort     || undefined,
          target_year:    year,
          target_quarter: quarter    || undefined,
          description:    description.trim() || undefined,
          goal_id:        goalId     || undefined,
          actual_spend:   parseFloat(actualSpend) || undefined,
        }),
      })
      const body = await res.json()
      if (!res.ok) { setError(body.error ?? 'Failed to save.'); return }
      onCreated(body)
    } catch {
      setError('Network error — please try again.')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:border-zinc-400 bg-white'
  const labelCls = 'block text-xs text-zinc-500 mb-1 font-medium'

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-black/20 z-40" />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 shrink-0">
            <div>
              <h2 className="font-semibold text-zinc-900">Add past project</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Record a completed project with its history.</p>
            </div>
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 transition-colors text-xl leading-none">✕</button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {/* Name */}
            <div>
              <label className={labelCls}>Project name *</label>
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Front porch railing replacement"
                className={inputCls}
              />
            </div>

            {/* Domain */}
            <div>
              <label className={labelCls}>Domain *</label>
              <select value={domain} onChange={e => setDomain(e.target.value)} className={inputCls}>
                {DOMAINS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                <option value="__custom__">Other…</option>
              </select>
              {domain === '__custom__' && (
                <input value={customDomain} onChange={e => setCustom(e.target.value)}
                  placeholder="Custom domain name" className={`${inputCls} mt-2`} />
              )}
            </div>

            {/* Priority + Effort */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Priority</label>
                <select value={priority} onChange={e => setPriority(e.target.value)} className={inputCls}>
                  {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Effort</label>
                <select value={effort} onChange={e => setEffort(e.target.value)} className={inputCls}>
                  <option value="">— unknown —</option>
                  {EFFORTS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                </select>
              </div>
            </div>

            {/* Completion period */}
            <div>
              <label className={labelCls}>Completion period</label>
              <div className="grid grid-cols-2 gap-3">
                <select value={year} onChange={e => setYear(Number(e.target.value))} className={inputCls}>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select value={quarter} onChange={e => setQuarter(e.target.value ? Number(e.target.value) : '')} className={inputCls}>
                  <option value="">Quarter (optional)</option>
                  {QUARTERS.map(q => <option key={q.value} value={q.value}>{q.label}</option>)}
                </select>
              </div>
            </div>

            {/* Actual spend */}
            <div>
              <label className={labelCls}>Actual spend</label>
              <input
                type="number"
                value={actualSpend}
                onChange={e => setActualSpend(e.target.value)}
                placeholder="0"
                className={inputCls}
              />
            </div>

            {/* Goal */}
            {goals.length > 0 && (
              <div>
                <label className={labelCls}>Goal (optional)</label>
                <select value={goalId} onChange={e => setGoalId(e.target.value)} className={inputCls}>
                  <option value="">— none —</option>
                  {goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
            )}

            {/* Description */}
            <div>
              <label className={labelCls}>Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What was done, what was learned, any relevant notes…"
                rows={3}
                className={`${inputCls} resize-none`}
              />
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-zinc-100 flex gap-3 shrink-0">
            <button
              onClick={submit}
              disabled={!name.trim() || saving}
              className="px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg disabled:opacity-40 hover:bg-zinc-700 transition-colors"
            >
              {saving ? 'Saving…' : 'Save project'}
            </button>
            <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-800 transition-colors">
              Cancel
            </button>
            <p className="ml-auto text-xs text-zinc-400 self-center">Budget lines can be added from the project panel after saving.</p>
          </div>
        </div>
      </div>
    </>
  )
}
