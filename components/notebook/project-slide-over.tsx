'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Bot, Send } from 'lucide-react'
import { type Project } from './project-card'
import { type Goal } from './goals-panel'
import { TaskList } from './task-list'
import { quarterLabel, fmtCurrency } from './quarter-utils'

const STATUS_STYLES: Record<string, string> = {
  planned:   'bg-zinc-100 text-zinc-600',
  active:    'bg-blue-50 text-blue-700',
  on_hold:   'bg-amber-50 text-amber-700',
  complete:  'bg-green-50 text-green-700',
  cancelled: 'bg-zinc-100 text-zinc-400',
}

const EFFORT_LABEL: Record<string, string> = {
  low: 'Low effort', medium: 'Medium effort', high: 'High effort', very_high: 'Very high effort',
}

const PRIORITY_DOT: Record<string, string> = {
  high: 'bg-red-400', medium: 'bg-amber-400', low: 'bg-zinc-300',
}

function shortDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

type BudgetLine = { id: string; description: string; estimated_amount: number | null; actual_amount: number | null }

type Props = {
  project: (Project & { goal_id: string | null }) | null
  goals: Goal[]
  allProjects: (Project & { goal_id: string | null })[]
  isOwner: boolean
  onClose: () => void
  onArchived?: (projectId: string, status: 'complete' | 'cancelled') => void
}

const SAGE = 'oklch(0.50 0.10 155)'

type PhotoReview = {
  signedUrl: string
  status: 'loading' | 'done'
  messages: { role: 'user' | 'assistant'; content: string }[]
  draft: string
}

type BudgetAgent = {
  status: 'loading' | 'done'
  messages: { role: 'user' | 'assistant'; content: string }[]
  draft: string
  suggestedBudget: number | null
}

export function ProjectSlideOver({ project, goals, allProjects, isOwner, onClose, onArchived }: Props) {
  const router = useRouter()
  const [targetBudget, setTargetBudget] = useState('')
  const [actualSpend,  setActualSpend]  = useState('')
  const [lines, setLines]               = useState<BudgetLine[]>([])
  const [saving, setSaving]             = useState(false)
  const [newLine, setNewLine]           = useState<{ description: string; estimated: string; actual: string } | null>(null)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [archiving, setArchiving]           = useState(false)
  const [archiveError, setArchiveError]     = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoErr, setPhotoErr]             = useState<string | null>(null)
  const [photoReview, setPhotoReview]       = useState<PhotoReview | null>(null)
  const [budgetAgent, setBudgetAgent]       = useState<BudgetAgent | null>(null)
  const [budgetApplied, setBudgetApplied]   = useState(false)
  const photoRef    = useRef<HTMLInputElement>(null)
  const budgetChatEndRef = useRef<HTMLDivElement>(null)

  async function doArchive(status: 'complete' | 'cancelled') {
    if (!project) return
    setArchiving(true)
    setArchiveError(null)
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setArchiveError(body.error ?? 'Failed to archive project.')
        return
      }
      if (onArchived) {
        onArchived(project.id, status)
      } else {
        onClose()
        router.refresh()
      }
    } catch {
      setArchiveError('Network error — please try again.')
    } finally {
      setArchiving(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTargetBudget(project?.target_budget != null ? String(project.target_budget) : '')
    setActualSpend(project?.actual_spend   != null ? String(project.actual_spend)  : '')
    setLines(project?.budget_lines ?? [])
    setNewLine(null)
    setConfirmArchive(false)
    setArchiveError(null)
    setPhotoReview(null)
    setPhotoErr(null)
    setBudgetAgent(null)
    setBudgetApplied(false)
  }, [project?.id])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const open          = !!project
  const goal          = project?.goal_id          ? goals.find(g => g.id === project.goal_id)                   : null
  const parentProject = project?.parent_project_id ? allProjects.find(p => p.id === project.parent_project_id) : null

  const estimatedTotal  = lines.reduce((s, b) => s + (b.estimated_amount ?? 0), 0)
  const actualLineTotal = lines.reduce((s, b) => s + (b.actual_amount    ?? 0), 0)
  const inheritedEstimate = parentProject?.target_budget ?? null

  const parsedTarget  = parseFloat(targetBudget) || 0
  const parsedActual  = parseFloat(actualSpend)  || 0
  const spendRef      = parsedActual > 0 ? parsedActual : actualLineTotal
  const hasTarget     = parsedTarget > 0
  const overTarget    = hasTarget && spendRef > parsedTarget
  const spendPct      = hasTarget ? Math.min(100, Math.round((spendRef / parsedTarget) * 100)) : 0

  async function saveProjectField(field: 'target_budget' | 'actual_spend', raw: string) {
    if (!project) return
    const num = parseFloat(raw) || null
    setSaving(true)
    try {
      await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: num }),
      })
    } finally { setSaving(false) }
  }

  async function updateLine(id: string, patch: Partial<BudgetLine>) {
    setLines(l => l.map(x => x.id === id ? { ...x, ...patch } : x))
    await fetch(`/api/budget-lines/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
  }

  async function deleteLine(id: string) {
    const prev = lines
    setLines(l => l.filter(x => x.id !== id))
    const res = await fetch(`/api/budget-lines/${id}`, { method: 'DELETE' })
    if (!res.ok) setLines(prev)
  }

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !project) return
    setPhotoUploading(true); setPhotoErr(null); setPhotoReview(null)
    try {
      const urlRes = await fetch('/api/photos/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name }),
      })
      const urlData = await urlRes.json()
      if (!urlRes.ok) { setPhotoErr(urlData.error ?? 'Upload failed'); return }

      const supabase = createClient()
      const { error: upErr } = await supabase.storage
        .from('Home Agent')
        .uploadToSignedUrl(urlData.path, urlData.token, file, { contentType: file.type })
      if (upErr) { setPhotoErr(upErr.message); return }

      const { data: signed } = await supabase.storage
        .from('Home Agent')
        .createSignedUrl(urlData.path, 3600)
      const signedUrl = signed?.signedUrl
      if (!signedUrl) { setPhotoErr('Could not generate preview URL'); return }

      setPhotoReview({ signedUrl, status: 'loading', messages: [], draft: '' })

      const tasks = project.tasks.filter(t => t.status !== 'done').map(t => t.title)
      const res = await fetch('/api/photos/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signedUrl,
          projectContext: { name: project.name, description: project.description, tasks },
          messages: [],
        }),
      })
      const data = await res.json()
      setPhotoReview(r => r && {
        ...r,
        status: 'done',
        messages: [{ role: 'assistant', content: data.response }],
      })
    } catch (err) {
      setPhotoErr(String(err))
    } finally {
      setPhotoUploading(false)
      if (photoRef.current) photoRef.current.value = ''
    }
  }

  async function sendPhotoReply() {
    if (!photoReview || !photoReview.draft.trim()) return
    const userMsg = { role: 'user' as const, content: photoReview.draft.trim() }
    const nextMessages = [...photoReview.messages, userMsg]
    setPhotoReview(r => r && { ...r, messages: nextMessages, draft: '', status: 'loading' })
    try {
      const res = await fetch('/api/photos/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signedUrl: photoReview.signedUrl, messages: nextMessages }),
      })
      const data = await res.json()
      setPhotoReview(r => r && {
        ...r,
        status: 'done',
        messages: [...nextMessages, { role: 'assistant', content: data.response }],
      })
    } catch {
      setPhotoReview(r => r && { ...r, status: 'done' })
    }
  }

  async function openBudgetAgent() {
    if (!project) return
    setBudgetAgent({ status: 'loading', messages: [], draft: '', suggestedBudget: null })
    setBudgetApplied(false)
    try {
      const res = await fetch('/api/agent/project-budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: { name: project.name, description: project.description, domain: project.domain, effort: project.effort, target_budget: project.target_budget },
          messages: [],
        }),
      })
      const data = await res.json()
      setBudgetAgent({ status: 'done', messages: [{ role: 'assistant', content: data.message }], draft: '', suggestedBudget: data.suggestions?.target_budget ?? null })
    } catch {
      setBudgetAgent(a => a && { ...a, status: 'done' })
    }
  }

  async function sendBudgetAgentMessage() {
    if (!budgetAgent || !budgetAgent.draft.trim() || !project) return
    const userMsg = { role: 'user' as const, content: budgetAgent.draft.trim() }
    const next = [...budgetAgent.messages, userMsg]
    setBudgetAgent(a => a && { ...a, messages: next, draft: '', status: 'loading' })
    try {
      const res = await fetch('/api/agent/project-budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: { name: project.name, description: project.description, domain: project.domain, effort: project.effort, target_budget: project.target_budget },
          messages: next,
        }),
      })
      const data = await res.json()
      setBudgetAgent(a => a && {
        ...a, status: 'done',
        messages: [...next, { role: 'assistant', content: data.message }],
        suggestedBudget: data.suggestions?.target_budget ?? a.suggestedBudget,
      })
    } catch {
      setBudgetAgent(a => a && { ...a, status: 'done' })
    }
    setTimeout(() => budgetChatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  function applyBudgetSuggestion(amount: number) {
    setTargetBudget(String(amount))
    saveProjectField('target_budget', String(amount))
    setBudgetApplied(true)
  }

  async function addLine() {
    if (!newLine || !project) return
    const desc = newLine.description.trim()
    if (!desc) return
    const estimated = parseFloat(newLine.estimated) || null
    const actual    = parseFloat(newLine.actual)    || null
    const res = await fetch('/api/budget-lines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: project.id, description: desc, estimated_amount: estimated, actual_amount: actual }),
    })
    if (res.ok) {
      const saved: BudgetLine = await res.json()
      setLines(l => [...l, saved])
    }
    setNewLine(null)
  }

  return (
    <>
      <div onClick={onClose} className={`fixed inset-0 bg-black/20 z-40 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} />

      <div className={`fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        {!project ? null : (
          <>
            {/* Header */}
            <div className="border-b border-zinc-200 px-6 py-5 flex items-start justify-between gap-4 shrink-0">
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[project.priority] ?? 'bg-zinc-300'}`} />
                  <h2 className="font-semibold text-zinc-900 leading-snug">{project.name}</h2>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[project.status] ?? 'bg-zinc-100 text-zinc-600'}`}>
                    {project.status.replace('_', '\u00a0')}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 capitalize">{project.domain}</span>
                  {project.effort && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500">{EFFORT_LABEL[project.effort]}</span>
                  )}
                  {project.target_year && project.target_quarter && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500">{quarterLabel(project.target_year, project.target_quarter)}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-zinc-400">
                  {goal          && <span>Goal: {goal.name}</span>}
                  {parentProject && <span>From: {parentProject.name}</span>}
                  {saving        && <span className="text-zinc-300">saving…</span>}
                </div>
              </div>
              <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 transition-colors text-xl leading-none shrink-0 mt-0.5">✕</button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {project.description && (
                <p className="text-sm text-zinc-600 leading-relaxed">{project.description}</p>
              )}

              {/* Tasks */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-600">Tasks</h3>
                {project.tasks.length === 0 ? (
                  <p className="text-xs text-zinc-400 italic">No tasks yet — ask the Agent or add one directly.</p>
                ) : (
                  <TaskList tasks={project.tasks} projectName={project.name} projectId={project.id} />
                )}
              </div>

              {/* Photos */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-600">Photos</h3>
                <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/heic" onChange={uploadPhoto} className="hidden" />
                <button
                  onClick={() => photoRef.current?.click()}
                  disabled={photoUploading}
                  className="px-3 py-1.5 text-xs font-medium border border-zinc-200 rounded-lg hover:border-zinc-400 transition-colors disabled:opacity-40"
                >
                  {photoUploading ? 'Uploading…' : '+ Add photo'}
                </button>
                {photoErr && <p className="text-xs text-red-500">{photoErr}</p>}

                {photoReview && (
                  <div className="border border-zinc-200 rounded-lg p-3 bg-zinc-50 space-y-2">
                    <div className="flex items-start gap-2">
                      <img src={photoReview.signedUrl} alt="project photo"
                        className="w-10 h-10 rounded object-cover border border-zinc-200 shrink-0" />
                      <div className="min-w-0">
                        {photoReview.status === 'loading' && (
                          <p className="text-xs text-zinc-400 italic">Agent reviewing…</p>
                        )}
                        {photoReview.status === 'done' && photoReview.messages.map((m, i) => (
                          <div key={i} className={`text-xs leading-relaxed ${m.role === 'user' ? 'text-zinc-500 italic' : 'text-zinc-700'}`}>
                            {m.role === 'assistant' && <span className="text-zinc-400 font-medium uppercase tracking-wide text-[10px] block mb-0.5">Agent</span>}
                            {m.content}
                          </div>
                        ))}
                      </div>
                      <button onClick={() => setPhotoReview(null)} className="text-zinc-300 hover:text-zinc-500 text-xs shrink-0">✕</button>
                    </div>

                    {photoReview.status === 'done' &&
                      photoReview.messages[photoReview.messages.length - 1]?.role === 'assistant' &&
                      photoReview.messages.length < 4 && (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={photoReview.draft}
                          onChange={e => setPhotoReview(r => r && { ...r, draft: e.target.value })}
                          onKeyDown={e => e.key === 'Enter' && sendPhotoReply()}
                          placeholder="Reply…"
                          className="flex-1 text-xs border border-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-zinc-400 bg-white"
                        />
                        <button
                          onClick={sendPhotoReply}
                          disabled={!photoReview.draft.trim()}
                          className="px-2.5 py-1.5 text-xs font-medium bg-zinc-900 text-white rounded-lg hover:bg-zinc-700 disabled:opacity-40 transition-colors"
                        >
                          Send
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Budget (owner only) */}
              {isOwner && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-600">Budget</h3>

                  {/* Target + actual spend */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">Target Budget</label>
                      <input type="number" value={targetBudget} onChange={e => setTargetBudget(e.target.value)} onBlur={() => saveProjectField('target_budget', targetBudget)} placeholder="0"
                        className="w-full text-sm bg-white border border-zinc-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-zinc-400" />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">Actual Spend</label>
                      <input type="number" value={actualSpend} onChange={e => setActualSpend(e.target.value)} onBlur={() => saveProjectField('actual_spend', actualSpend)} placeholder="0"
                        className="w-full text-sm bg-white border border-zinc-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-zinc-400" />
                    </div>
                  </div>

                  {/* Progress bar */}
                  {hasTarget && (
                    <div className="space-y-1">
                      <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${overTarget ? 'bg-red-400' : ''}`} style={{ width: `${spendPct}%`, backgroundColor: overTarget ? undefined : 'var(--sage)' }} />
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-400">{fmtCurrency(spendRef)} spent</span>
                        <span className={overTarget ? 'text-red-500 font-medium' : 'text-zinc-400'}>
                          {overTarget ? `${fmtCurrency(spendRef - parsedTarget)} over` : `${fmtCurrency(parsedTarget - spendRef)} left of ${fmtCurrency(parsedTarget)}`}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Ask Agent button */}
                  {!budgetAgent && (
                    <button
                      onClick={openBudgetAgent}
                      className="flex items-center gap-1.5 text-xs font-medium transition-colors"
                      style={{ color: SAGE }}
                    >
                      <Bot className="w-3 h-3" />
                      Ask Agent to help estimate this budget
                    </button>
                  )}

                  {/* Inline budget agent chat */}
                  {budgetAgent && (
                    <div className="border border-zinc-200 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-100 bg-zinc-50">
                        <div className="flex items-center gap-1.5">
                          <Bot className="w-3 h-3 text-zinc-500" />
                          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Agent · Budget Estimator</span>
                        </div>
                        <button onClick={() => setBudgetAgent(null)} className="text-zinc-400 hover:text-zinc-600 text-xs">✕</button>
                      </div>

                      <div className="px-3 py-3 space-y-2.5 max-h-52 overflow-y-auto bg-white">
                        {budgetAgent.messages.map((m, i) => (
                          <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>
                            {m.role === 'assistant' && (
                              <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wide mb-0.5">Agent</p>
                            )}
                            <div className={`text-xs leading-relaxed ${
                              m.role === 'user'
                                ? 'bg-zinc-100 text-zinc-700 px-2.5 py-1.5 rounded-xl rounded-tr-sm max-w-[80%] text-right'
                                : 'text-zinc-700'
                            }`}>
                              {m.content}
                            </div>
                          </div>
                        ))}
                        {budgetAgent.status === 'loading' && (
                          <p className="text-xs text-zinc-400 italic">Agent is thinking…</p>
                        )}
                        <div ref={budgetChatEndRef} />
                      </div>

                      {/* Suggestion apply banner */}
                      {budgetAgent.suggestedBudget != null && (
                        <div className="flex items-center justify-between gap-3 px-3 py-2.5 border-t border-zinc-100 bg-zinc-50">
                          <span className="text-xs text-zinc-600">
                            Suggested budget: <span className="font-semibold text-zinc-800">{fmtCurrency(budgetAgent.suggestedBudget)}</span>
                          </span>
                          {budgetApplied ? (
                            <span className="text-xs text-green-600 font-medium">Applied ✓</span>
                          ) : (
                            <button
                              onClick={() => applyBudgetSuggestion(budgetAgent.suggestedBudget!)}
                              className="text-xs font-semibold text-white px-2.5 py-1 rounded-lg transition-colors"
                              style={{ backgroundColor: SAGE }}
                            >
                              Apply
                            </button>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2 px-3 py-2.5 border-t border-zinc-100 bg-white">
                        <input
                          type="text"
                          value={budgetAgent.draft}
                          onChange={e => setBudgetAgent(a => a && { ...a, draft: e.target.value })}
                          onKeyDown={e => e.key === 'Enter' && sendBudgetAgentMessage()}
                          placeholder="Reply…"
                          disabled={budgetAgent.status === 'loading'}
                          className="flex-1 text-xs border border-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-zinc-400 disabled:opacity-50"
                        />
                        <button
                          onClick={sendBudgetAgentMessage}
                          disabled={!budgetAgent.draft.trim() || budgetAgent.status === 'loading'}
                          className="p-1.5 rounded-lg text-white disabled:opacity-40 transition-colors"
                          style={{ backgroundColor: SAGE }}
                        >
                          <Send className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}

                  {inheritedEstimate != null && (
                    <div className="flex justify-between text-xs text-zinc-400 border-t border-zinc-100 pt-2">
                      <span>Inherited from {parentProject!.name}</span>
                      <span>{fmtCurrency(inheritedEstimate)}</span>
                    </div>
                  )}

                  {/* Line items table */}
                  <div className="border-t border-zinc-100 pt-2 space-y-1">
                    {/* Column headers */}
                    <div className="grid grid-cols-[1fr_80px_80px_20px] gap-2 text-xs text-zinc-400 font-medium pb-1">
                      <span>Item</span>
                      <span className="text-right">Estimated</span>
                      <span className="text-right">Actual</span>
                      <span />
                    </div>

                    {lines.map(line => (
                      <BudgetLineRow key={line.id} line={line} onUpdate={updateLine} onDelete={deleteLine} />
                    ))}

                    {lines.length === 0 && !newLine && (
                      <p className="text-xs text-zinc-400 py-1 italic">No line items yet.</p>
                    )}

                    {/* Totals row */}
                    {lines.length > 0 && (
                      <div className="grid grid-cols-[1fr_80px_80px_20px] gap-2 text-xs font-medium text-zinc-600 border-t border-zinc-100 pt-2 mt-1">
                        <span>Total</span>
                        <span className="text-right">{estimatedTotal > 0 ? fmtCurrency(estimatedTotal) : '—'}</span>
                        <span className="text-right">{actualLineTotal > 0 ? fmtCurrency(actualLineTotal) : '—'}</span>
                        <span />
                      </div>
                    )}

                    {/* New line form */}
                    {newLine ? (
                      <div className="pt-2 space-y-2">
                        <input autoFocus value={newLine.description} onChange={e => setNewLine(n => n && { ...n, description: e.target.value })} placeholder="Item description"
                          className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-zinc-400" />
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-zinc-400 block mb-1">Estimated</label>
                            <input type="number" value={newLine.estimated} onChange={e => setNewLine(n => n && { ...n, estimated: e.target.value })} placeholder="0"
                              className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-zinc-400" />
                          </div>
                          <div>
                            <label className="text-xs text-zinc-400 block mb-1">Actual</label>
                            <input type="number" value={newLine.actual} onChange={e => setNewLine(n => n && { ...n, actual: e.target.value })} placeholder="0"
                              className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-zinc-400" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={addLine} className="px-3 py-1 bg-zinc-900 text-white text-xs rounded-lg hover:bg-zinc-700 transition-colors">Add</button>
                          <button onClick={() => setNewLine(null)} className="px-3 py-1 text-xs text-zinc-400 hover:text-zinc-700">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setNewLine({ description: '', estimated: '', actual: '' })}
                        className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors pt-1">
                        + add line item
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Timeline */}
              {project.timeline_events.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-600">Timeline</h3>
                  <ul className="space-y-1.5">
                    {project.timeline_events
                      .slice()
                      .sort((a, b) => a.event_date.localeCompare(b.event_date))
                      .map(e => (
                        <li key={e.id} className="flex items-start gap-3 text-sm">
                          <span className="text-xs text-zinc-400 shrink-0 pt-0.5 w-16">{shortDate(e.event_date)}</span>
                          <div className="min-w-0">
                            <p className="text-zinc-700">{e.title}</p>
                            {e.description && <p className="text-xs text-zinc-400 leading-snug">{e.description}</p>}
                          </div>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Footer — Archive */}
            {isOwner && project.status !== 'cancelled' && project.status !== 'complete' && (
              <div className="shrink-0 border-t border-zinc-100 px-6 py-3">
                {!confirmArchive ? (
                  <button
                    onClick={() => setConfirmArchive(true)}
                    className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
                  >
                    Archive project…
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-zinc-500">How should this be archived?</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        disabled={archiving}
                        onClick={() => doArchive('complete')}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 disabled:opacity-50 transition-colors"
                      >
                        {archiving ? 'Saving…' : 'Mark complete'}
                      </button>
                      <button
                        disabled={archiving}
                        onClick={() => doArchive('cancelled')}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 text-zinc-600 border border-zinc-200 hover:bg-zinc-200 disabled:opacity-50 transition-colors"
                      >
                        {archiving ? 'Saving…' : 'Cancel project'}
                      </button>
                      <button
                        onClick={() => setConfirmArchive(false)}
                        className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors ml-1"
                      >
                        Nevermind
                      </button>
                    </div>
                    {archiveError && <p className="text-xs text-red-500">{archiveError}</p>}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}

function BudgetLineRow({
  line, onUpdate, onDelete,
}: {
  line: BudgetLine
  onUpdate: (id: string, patch: Partial<BudgetLine>) => void
  onDelete: (id: string) => void
}) {
  const [desc,      setDesc]      = useState(line.description)
  const [estimated, setEstimated] = useState(line.estimated_amount != null ? String(line.estimated_amount) : '')
  const [actual,    setActual]    = useState(line.actual_amount    != null ? String(line.actual_amount)    : '')

  return (
    <div className="grid grid-cols-[1fr_80px_80px_20px] gap-2 group items-center">
      <input value={desc} onChange={e => setDesc(e.target.value)}
        onBlur={() => onUpdate(line.id, { description: desc })}
        style={{ color: 'oklch(0.58 0.012 75)' }}
        className="text-xs bg-transparent border-b border-transparent focus:border-zinc-200 focus:outline-none py-0.5" />
      <input type="number" value={estimated} onChange={e => setEstimated(e.target.value)}
        onBlur={() => onUpdate(line.id, { estimated_amount: estimated === '' ? null : parseFloat(estimated) || null })}
        placeholder="—"
        style={{ color: 'oklch(0.58 0.012 75)' }}
        className="text-xs text-right bg-transparent border-b border-transparent focus:border-zinc-200 focus:outline-none py-0.5" />
      <input type="number" value={actual} onChange={e => setActual(e.target.value)}
        onBlur={() => onUpdate(line.id, { actual_amount: actual === '' ? null : parseFloat(actual) || null })}
        placeholder="—"
        style={{ color: 'oklch(0.58 0.012 75)' }}
        className="text-xs text-right bg-transparent border-b border-transparent focus:border-zinc-200 focus:outline-none py-0.5" />
      <button onClick={() => onDelete(line.id)}
        className="text-zinc-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-xs">✕</button>
    </div>
  )
}
