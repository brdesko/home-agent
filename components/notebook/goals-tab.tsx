'use client'

import { useState, useRef } from 'react'
import { type Goal } from './goals-panel'
import { type Project } from './project-card'
import { fmtCurrency } from './quarter-utils'

type GoalWithProgress = Goal & {
  totalProjects: number
  activeProjects: number
  completeProjects: number
  estimatedSpend: number
  actualSpend: number
}

type ProjectRow = Project & { goal_id: string | null }

const STATUS_STYLES: Record<string, string> = {
  active:   'bg-blue-50 text-blue-700',
  complete: 'bg-green-50 text-green-700',
  paused:   'bg-zinc-100 text-zinc-500',
}

const PROJECT_STATUS_STYLES: Record<string, string> = {
  planned:  'text-zinc-400',
  active:   'text-blue-600',
  on_hold:  'text-amber-600',
  complete: 'text-green-600',
}

function rankStyle(rank: number) {
  if (rank === 1) return { badge: 'bg-zinc-900 text-white', border: 'border-zinc-700' }
  if (rank === 2) return { badge: 'bg-zinc-600 text-white', border: 'border-zinc-400' }
  if (rank === 3) return { badge: 'bg-zinc-400 text-white', border: 'border-zinc-300' }
  return              { badge: 'bg-zinc-100 text-zinc-400', border: 'border-zinc-200' }
}

type Props = {
  goals: GoalWithProgress[]
  projects: ProjectRow[]
}

// ── ProjectLinker ─────────────────────────────────────────────────────────────
function ProjectLinker({
  goalId,
  goalName,
  candidates,
  onLink,
  onSkip,
}: {
  goalId: string
  goalName: string
  candidates: ProjectRow[]
  onLink: (linked: string[]) => void
  onSkip: () => void
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search,   setSearch]   = useState('')
  const [linking,  setLinking]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const filtered = candidates.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.domain.toLowerCase().includes(search.toLowerCase())
  )

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function confirm() {
    if (selected.size === 0) { onSkip(); return }
    setLinking(true)
    setError(null)
    try {
      const results = await Promise.all(
        [...selected].map(id =>
          fetch(`/api/projects/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ goal_id: goalId }),
          })
        )
      )
      if (results.every(r => r.ok)) {
        onLink([...selected])
      } else {
        setError('Some projects failed to link. Try again.')
        setLinking(false)
      }
    } catch {
      setError('Network error. Try again.')
      setLinking(false)
    }
  }

  return (
    <div className="border border-blue-100 rounded-lg p-4 space-y-3 bg-blue-50/40">
      <div>
        <p className="text-sm font-medium text-zinc-800">Add projects to &ldquo;{goalName}&rdquo;</p>
        <p className="text-xs text-zinc-500 mt-0.5">Select existing projects to link, or skip to add later.</p>
      </div>

      {candidates.length > 4 && (
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search projects…"
          className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-zinc-400 bg-white"
        />
      )}

      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="text-xs text-zinc-400">No unlinked projects match.</p>
        )}
        {filtered.map(p => (
          <label key={p.id} className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={selected.has(p.id)}
              onChange={() => toggle(p.id)}
              className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400"
            />
            <span className="flex-1 text-sm text-zinc-700 group-hover:text-zinc-900">{p.name}</span>
            <span className={`text-xs capitalize shrink-0 ${PROJECT_STATUS_STYLES[p.status] ?? 'text-zinc-400'}`}>
              {p.status.replace('_', '\u00a0')}
            </span>
          </label>
        ))}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          onClick={confirm}
          disabled={linking}
          className="px-3 py-1.5 bg-zinc-900 text-white text-xs font-medium rounded-lg disabled:opacity-40 hover:bg-zinc-700 transition-colors"
        >
          {linking ? 'Linking…' : selected.size > 0 ? `Link ${selected.size} project${selected.size !== 1 ? 's' : ''}` : 'Done'}
        </button>
        <button onClick={onSkip} className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-700">
          Skip
        </button>
      </div>
    </div>
  )
}

// ── GoalsTab ──────────────────────────────────────────────────────────────────
export function GoalsTab({ goals: initialGoals, projects }: Props) {
  const [goals,      setGoals]      = useState<GoalWithProgress[]>(initialGoals)
  const [dragId,     setDragId]     = useState<string | null>(null)
  const [overId,     setOverId]     = useState<string | null>(null)
  const [showForm,   setShowForm]   = useState(false)
  const [newName,    setNewName]    = useState('')
  const [newDesc,    setNewDesc]    = useState('')
  const [newBudget,  setNewBudget]  = useState('')
  const [creating,   setCreating]   = useState(false)
  const [createErr,  setCreateErr]  = useState<string | null>(null)
  const [linkingId,  setLinkingId]  = useState<string | null>(null)
  const saving = useRef(false)

  // Projects not yet linked to any goal (excluding archived)
  const [projectGoals, setProjectGoals] = useState<Record<string, string | null>>(
    Object.fromEntries(projects.map(p => [p.id, p.goal_id]))
  )
  function unlinkedCandidates() {
    return projects.filter(p =>
      !projectGoals[p.id] &&
      p.status !== 'cancelled' &&
      p.status !== 'complete'
    )
  }

  // ── create goal ─────────────────────────────────────────────────────────
  async function createGoal() {
    const name = newName.trim()
    if (!name || creating) return
    setCreating(true)
    setCreateErr(null)
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description:   newDesc.trim() || undefined,
          target_budget: parseFloat(newBudget) || undefined,
        }),
      })
      const body = await res.json()
      if (!res.ok) {
        setCreateErr(body.error ?? 'Failed to create goal.')
        return
      }
      const newGoal: GoalWithProgress = {
        ...body,
        totalProjects: 0, activeProjects: 0, completeProjects: 0,
        estimatedSpend: 0, actualSpend: 0,
      }
      setGoals(g => [...g, newGoal])
      setNewName(''); setNewDesc(''); setNewBudget('')
      setShowForm(false)
      // Trigger project linker if there are candidates
      if (unlinkedCandidates().length > 0) setLinkingId(body.id)
    } catch (e) {
      setCreateErr('Network error — please try again.')
    } finally {
      setCreating(false)
    }
  }

  function handleLinked(goalId: string, linkedIds: string[]) {
    // Update local projectGoals map
    setProjectGoals(prev => {
      const next = { ...prev }
      linkedIds.forEach(id => { next[id] = goalId })
      return next
    })
    // Update goal's project counts
    setGoals(gs => gs.map(g => g.id === goalId
      ? { ...g, totalProjects: g.totalProjects + linkedIds.length, activeProjects: g.activeProjects + linkedIds.length }
      : g
    ))
    setLinkingId(null)
  }

  // ── drag reorder ─────────────────────────────────────────────────────────
  function handleDragStart(id: string) { setDragId(id) }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault()
    if (id !== dragId) setOverId(id)
  }

  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault()
    if (!dragId || dragId === targetId) { setDragId(null); setOverId(null); return }
    const next = [...goals]
    const from = next.findIndex(g => g.id === dragId)
    const to   = next.findIndex(g => g.id === targetId)
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setGoals(next)
    setDragId(null); setOverId(null)
    if (!saving.current) {
      saving.current = true
      fetch('/api/goals/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: next.map(g => g.id) }),
      }).finally(() => { saving.current = false })
    }
  }

  function handleDragEnd() { setDragId(null); setOverId(null) }

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-400">Drag to reorder by priority. Rank #1 is highest.</p>
        <button
          onClick={() => { setShowForm(s => !s); setCreateErr(null) }}
          className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          {showForm ? 'Cancel' : '+ New goal'}
        </button>
      </div>

      {/* New goal form */}
      {showForm && (
        <div className="border border-zinc-200 rounded-lg p-4 space-y-3 bg-zinc-50">
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') createGoal() }}
            placeholder="Goal name"
            className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:border-zinc-400 bg-white"
          />
          <input
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:border-zinc-400 bg-white"
          />
          <input
            type="number"
            value={newBudget}
            onChange={e => setNewBudget(e.target.value)}
            placeholder="Target budget (optional)"
            className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:border-zinc-400 bg-white"
          />
          {createErr && <p className="text-xs text-red-500">{createErr}</p>}
          <div className="flex gap-2">
            <button
              onClick={createGoal}
              disabled={!newName.trim() || creating}
              className="px-3 py-1.5 bg-zinc-900 text-white text-xs font-medium rounded-lg disabled:opacity-40 hover:bg-zinc-700 transition-colors"
            >
              {creating ? 'Creating…' : 'Create goal'}
            </button>
            <button onClick={() => { setShowForm(false); setCreateErr(null) }} className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-700">
              Cancel
            </button>
          </div>
        </div>
      )}

      {goals.length === 0 && !showForm && (
        <p className="text-sm text-zinc-400 py-4">No goals yet. Add one above or ask the Agent.</p>
      )}

      {/* Goal cards */}
      {goals.map((goal, idx) => {
        const rank        = idx + 1
        const rs          = rankStyle(rank)
        const linked      = projects.filter(p => projectGoals[p.id] === goal.id && p.status !== 'cancelled')
        const completionPct = goal.totalProjects > 0
          ? Math.round((goal.completeProjects / goal.totalProjects) * 100) : 0
        const hasTarget  = goal.target_budget != null && goal.target_budget > 0
        const spendPct   = hasTarget ? Math.min(100, Math.round((goal.actualSpend / goal.target_budget!) * 100)) : 0
        const overBudget = hasTarget && goal.actualSpend > goal.target_budget!
        const surplus    = hasTarget ? goal.target_budget! - goal.actualSpend : 0
        const isDragging = dragId === goal.id
        const isOver     = overId === goal.id

        return (
          <div key={goal.id} className="space-y-2">
            <div
              draggable
              onDragStart={() => handleDragStart(goal.id)}
              onDragOver={e => handleDragOver(e, goal.id)}
              onDrop={e => handleDrop(e, goal.id)}
              onDragEnd={handleDragEnd}
              className={`border rounded-lg p-5 space-y-4 cursor-grab active:cursor-grabbing select-none transition-all ${rs.border}
                ${isDragging ? 'opacity-40 scale-[0.98]' : ''}
                ${isOver ? 'ring-2 ring-zinc-400 ring-offset-1' : ''}`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${rs.badge}`}>
                    {rank}
                  </span>
                  <h3 className="font-semibold text-zinc-900 leading-snug">{goal.name}</h3>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setLinkingId(linkingId === goal.id ? null : goal.id)}
                    className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
                  >
                    + projects
                  </button>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[goal.status] ?? 'bg-zinc-100 text-zinc-500'}`}>
                    {goal.status}
                  </span>
                  <span className="text-zinc-300 text-sm select-none">⠿</span>
                </div>
              </div>

              {goal.description && (
                <p className="text-sm text-zinc-500 leading-relaxed">{goal.description}</p>
              )}

              {/* Completion bar */}
              {goal.totalProjects > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>{goal.completeProjects} of {goal.totalProjects} project{goal.totalProjects !== 1 ? 's' : ''} complete</span>
                    <span>{completionPct}%</span>
                  </div>
                  <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${completionPct}%`, backgroundColor: 'var(--sage)' }} />
                  </div>
                </div>
              )}

              {/* Spend tracking */}
              {(hasTarget || goal.estimatedSpend > 0 || goal.actualSpend > 0) && (
                <div className="space-y-2 pt-1 border-t border-zinc-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Spend</span>
                    <div className="flex items-center gap-3">
                      {goal.estimatedSpend > 0 && <span className="text-zinc-400">Est. {fmtCurrency(goal.estimatedSpend)}</span>}
                      {goal.actualSpend > 0 && <span className="text-zinc-600 font-medium">Actual {fmtCurrency(goal.actualSpend)}</span>}
                      {hasTarget && (
                        <span className={overBudget ? 'text-red-500 font-medium' : 'text-zinc-400'}>
                          {overBudget ? `${fmtCurrency(Math.abs(surplus))} over` : `${fmtCurrency(surplus)} left`}
                        </span>
                      )}
                    </div>
                  </div>
                  {hasTarget && (
                    <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${overBudget ? 'bg-red-400' : ''}`} style={{ width: `${spendPct}%`, backgroundColor: overBudget ? undefined : 'var(--sage)' }} />
                    </div>
                  )}
                  {hasTarget && <p className="text-xs text-zinc-400">Target {fmtCurrency(goal.target_budget!)}</p>}
                </div>
              )}

              {/* Linked projects */}
              {linked.length > 0 ? (
                <ul className="space-y-1.5 pt-1">
                  {linked.map(p => {
                    const estimated = p.budget_lines.reduce((s, b) => s + (b.estimated_amount ?? 0), 0)
                    return (
                      <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-zinc-700">{p.name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          {p.actual_spend != null && p.actual_spend > 0 && <span className="text-xs text-zinc-500">{fmtCurrency(p.actual_spend)}</span>}
                          {estimated > 0 && !p.actual_spend && <span className="text-xs text-zinc-400">~{fmtCurrency(estimated)}</span>}
                          <span className={`text-xs capitalize ${PROJECT_STATUS_STYLES[p.status] ?? 'text-zinc-400'}`}>{p.status.replace('_', '\u00a0')}</span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="text-xs text-zinc-400 pt-1">No projects assigned yet.</p>
              )}
            </div>

            {/* Project linker — shown after creation or when "+ projects" is clicked */}
            {linkingId === goal.id && (
              <ProjectLinker
                goalId={goal.id}
                goalName={goal.name}
                candidates={unlinkedCandidates()}
                onLink={ids => handleLinked(goal.id, ids)}
                onSkip={() => setLinkingId(null)}
              />
            )}
          </div>
        )
      })}

      {/* Unlinked projects bucket */}
      {unlinkedCandidates().length > 0 && (
        <div className="border border-dashed border-zinc-200 rounded-lg p-5 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-600">Not assigned to a goal</h3>
          <ul className="space-y-1.5">
            {unlinkedCandidates().map(p => (
              <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-zinc-500">{p.name}</span>
                <span className={`text-xs capitalize shrink-0 ${PROJECT_STATUS_STYLES[p.status] ?? 'text-zinc-400'}`}>
                  {p.status.replace('_', '\u00a0')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
