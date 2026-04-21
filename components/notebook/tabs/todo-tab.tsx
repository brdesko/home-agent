'use client'

import { useState, useEffect } from 'react'
import { type Project } from '../project-card'
import { type Goal } from '../goals-panel'
import { getCurrentQuarter } from '../quarter-utils'
import { ProjectSlideOver } from '../project-slide-over'

export type OngoingTask = {
  id: string
  title: string
  description: string | null
  recurrence: string | null
  active_months: number[] | null
  last_completed_at: string | null
}

type ProjectRow = Project & { goal_id: string | null }

type UnifiedTask = {
  id: string
  title: string
  status: string
  due_date: string | null
  category: 'suggested' | 'ongoing' | 'project'
  projectId: string | null
  projectName: string | null
  domain: string | null
  description: string | null
}

type Props = {
  projects: ProjectRow[]
  goals: Goal[]
  ongoingTasks: OngoingTask[]
  isOwner: boolean
}

const CATEGORY_BADGE: Record<string, string> = {
  suggested: 'bg-amber-50 text-amber-700 border border-amber-200',
  ongoing:   'bg-blue-50 text-blue-700 border border-blue-200',
  project:   'bg-zinc-100 text-zinc-600 border border-zinc-200',
}

const CATEGORY_LABEL: Record<string, string> = {
  suggested: 'Suggested',
  ongoing:   'Ongoing',
  project:   'Project',
}

function shortDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function agentHref(task: UnifiedTask): string {
  let ctx = ''
  if (task.category === 'suggested') {
    ctx = `I saw this property suggestion: "${task.title}". Can you give me more detail on how to approach this for my property, and flag any considerations I should know about?`
  } else if (task.category === 'ongoing') {
    ctx = `I'm looking at the ongoing task "${task.title}"${task.description ? ` — ${task.description}` : ''}. Can you help me think through how to approach this?`
  } else {
    ctx = `I'm working on the task "${task.title}"${task.projectName ? ` in the project "${task.projectName}"` : ''}. Can you give me practical advice on how to get started and anything important to watch out for?`
  }
  return `/agent?ctx=${encodeURIComponent(ctx)}`
}

function SectionProgress({ done, total }: { done: number; total: number }) {
  if (total === 0) return null
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1 bg-zinc-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: 'var(--sage)' }} />
      </div>
      <span className="text-xs text-zinc-400 shrink-0">{done}/{total} done</span>
    </div>
  )
}

function AddCostLineForm({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const [description, setDesc] = useState('')
  const [estimated,   setEst]  = useState('')
  const [actual,      setAct]  = useState('')
  const [saving,      setSave] = useState(false)
  const [error,       setErr]  = useState<string | null>(null)

  async function submit() {
    if (!description.trim()) { setErr('Description is required.'); return }
    setSave(true); setErr(null)
    try {
      const res = await fetch('/api/budget-lines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id:       projectId,
          description:      description.trim(),
          estimated_amount: parseFloat(estimated) || null,
          actual_amount:    parseFloat(actual)    || null,
        }),
      })
      if (!res.ok) { const b = await res.json(); setErr(b.error ?? 'Failed'); return }
      onDone()
    } catch { setErr('Network error.') } finally { setSave(false) }
  }

  const inp = 'text-sm border border-zinc-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-zinc-400 bg-white w-full'
  return (
    <div className="mt-3 p-3 bg-zinc-50 rounded-lg border border-zinc-200 space-y-2">
      <p className="text-xs font-medium text-zinc-500">Add cost line to project</p>
      <input value={description} onChange={e => setDesc(e.target.value)} placeholder="Description *" className={inp} />
      <div className="grid grid-cols-2 gap-2">
        <input type="number" value={estimated} onChange={e => setEst(e.target.value)} placeholder="Estimated $" className={inp} />
        <input type="number" value={actual}    onChange={e => setAct(e.target.value)} placeholder="Actual $"    className={inp} />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button onClick={submit} disabled={saving}
          className="text-xs px-3 py-1.5 bg-zinc-900 text-white rounded-md disabled:opacity-40 hover:bg-zinc-700">
          {saving ? 'Saving…' : 'Save line'}
        </button>
        <button onClick={onDone} className="text-xs text-zinc-400 hover:text-zinc-700">Cancel</button>
      </div>
    </div>
  )
}

function TaskRow({
  task,
  project,
  goals,
  isOwner,
  allProjects,
  onSelectProject,
}: {
  task: UnifiedTask
  project: ProjectRow | null
  goals: Goal[]
  isOwner: boolean
  allProjects: ProjectRow[]
  onSelectProject: (p: ProjectRow) => void
}) {
  const [expanded,     setExpanded]     = useState(false)
  const [showCostForm, setShowCostForm] = useState(false)

  return (
    <li className="border border-zinc-100 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-zinc-50 transition-colors"
      >
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${CATEGORY_BADGE[task.category]}`}>
          {CATEGORY_LABEL[task.category]}
        </span>
        <span className="flex-1 text-sm text-zinc-600">{task.title}</span>
        {task.projectName && (
          <span className="text-xs text-zinc-400 shrink-0 hidden sm:block">{task.projectName}</span>
        )}
        {task.due_date && (
          <span className="text-xs text-zinc-400 shrink-0">{shortDate(task.due_date)}</span>
        )}
        <span className={`text-zinc-300 text-xs shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}>▼</span>
      </button>

      <div className={`overflow-hidden transition-all duration-200 ease-out ${expanded ? 'max-h-80' : 'max-h-0'}`}>
        <div className="px-4 pb-4 pt-1 border-t border-zinc-100">
          {task.description && (
            <p className="text-sm text-zinc-500 mb-3 leading-relaxed">{task.description}</p>
          )}

          <div className="flex flex-wrap gap-2">
            {project && (
              <button
                onClick={() => onSelectProject(project)}
                className="text-xs px-3 py-1.5 border border-zinc-200 rounded-md text-zinc-700 hover:border-zinc-400 hover:bg-white transition-colors"
              >
                Go to project →
              </button>
            )}

            {isOwner && task.projectId && !showCostForm && (
              <button
                onClick={() => setShowCostForm(true)}
                className="text-xs px-3 py-1.5 border border-zinc-200 rounded-md text-zinc-700 hover:border-zinc-400 hover:bg-white transition-colors"
              >
                Add cost line
              </button>
            )}

            <a
              href={agentHref(task)}
              className="text-xs px-3 py-1.5 border border-zinc-200 rounded-md text-zinc-700 hover:border-zinc-400 hover:bg-white transition-colors"
            >
              Ask Agent →
            </a>
          </div>

          {showCostForm && task.projectId && (
            <AddCostLineForm projectId={task.projectId} onDone={() => setShowCostForm(false)} />
          )}
        </div>
      </div>
    </li>
  )
}

type CategoryFilter = 'all' | 'suggested' | 'ongoing' | 'project'

export function TodoTab({ projects, goals, ongoingTasks, isOwner }: Props) {
  const [suggestions,      setSuggestions]      = useState<string[]>([])
  const [loadingSuggestions, setLoadingSugs]    = useState(true)
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null)
  const [selectedProject,  setSelectedProject]  = useState<ProjectRow | null>(null)
  const [filter,           setFilter]           = useState<CategoryFilter>('all')

  useEffect(() => {
    fetch('/api/suggestions')
      .then(r => r.json())
      .then(d => {
        setSuggestions(d.suggestions ?? [])
        if (d.weatherError) setSuggestionsError(d.weatherError)
        setLoadingSugs(false)
      })
      .catch(e => {
        setSuggestionsError(String(e))
        setLoadingSugs(false)
      })
  }, [])

  const { year, quarter } = getCurrentQuarter()
  const today   = new Date()
  const weekOut = new Date(today)
  weekOut.setDate(today.getDate() + 7)
  const todayStr   = today.toISOString().split('T')[0]
  const weekOutStr = weekOut.toISOString().split('T')[0]

  function fmtDateRange(a: Date, b: Date): string {
    const mo = (d: Date) => d.toLocaleDateString('en-US', { month: 'short' })
    const aM = mo(a), bM = mo(b)
    return aM === bM ? `${aM} ${a.getDate()}–${b.getDate()}` : `${aM} ${a.getDate()} – ${bM} ${b.getDate()}`
  }
  const currentMonth = today.getMonth() + 1 // 1-based

  // Quarter end date
  const quarterEndMonth = quarter * 3
  const quarterEnd = new Date(year, quarterEndMonth, 0) // last day of quarter
  const quarterEndStr = quarterEnd.toISOString().split('T')[0]

  // Build unified task list
  const allUnified: UnifiedTask[] = []

  // Suggestions
  if (!loadingSuggestions && !suggestionsError) {
    for (const s of suggestions) {
      allUnified.push({
        id: `suggestion-${s}`,
        title: s,
        status: 'todo',
        due_date: null,
        category: 'suggested',
        projectId: null,
        projectName: null,
        domain: null,
        description: null,
      })
    }
  }

  // Ongoing tasks
  for (const ot of ongoingTasks) {
    allUnified.push({
      id: ot.id,
      title: ot.title,
      status: 'todo',
      due_date: null,
      category: 'ongoing',
      projectId: null,
      projectName: null,
      domain: null,
      description: ot.description,
    })
  }

  // Project tasks (active projects only)
  const activeProjects = projects.filter(p => p.status !== 'complete' && p.status !== 'cancelled')
  for (const p of activeProjects) {
    for (const t of p.tasks) {
      if (t.status === 'done') continue
      allUnified.push({
        id: t.id,
        title: t.title,
        status: t.status,
        due_date: t.due_date ?? null,
        category: 'project',
        projectId: p.id,
        projectName: p.name,
        domain: p.domain,
        description: null,
      })
    }
  }

  // Classify into sections
  function isThisWeek(t: UnifiedTask): boolean {
    if (t.category === 'suggested') return true
    if (t.category === 'ongoing') {
      const ot = ongoingTasks.find(o => o.id === t.id)
      return !ot?.active_months || ot.active_months.includes(currentMonth)
    }
    return !!t.due_date && t.due_date >= todayStr && t.due_date <= weekOutStr
  }

  function isRestOfQuarter(t: UnifiedTask): boolean {
    if (isThisWeek(t)) return false
    if (t.category === 'project') {
      if (t.due_date && t.due_date > weekOutStr && t.due_date <= quarterEndStr) return true
      // No due date — use project's target quarter
      const p = activeProjects.find(pr => pr.id === t.projectId)
      return !!p && p.target_year === year && p.target_quarter === quarter
    }
    // Ongoing tasks not active this month still show in rest-of-quarter
    if (t.category === 'ongoing') return true
    return false
  }

  function sortKey(t: UnifiedTask): string {
    return t.due_date ?? '9999-12-31'
  }

  const visible        = filter === 'all' ? allUnified : allUnified.filter(t => t.category === filter)
  const thisWeek       = visible.filter(isThisWeek).sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
  const restOfQuarter  = visible.filter(isRestOfQuarter).sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
  const noTasks        = thisWeek.length === 0 && restOfQuarter.length === 0 && !loadingSuggestions

  // Progress: count done project tasks per bucket, respecting filter
  const tracksDone = filter === 'all' || filter === 'project'
  const doneThisWeek = tracksDone
    ? activeProjects.flatMap(p => p.tasks).filter(
        t => t.status === 'done' && t.due_date && t.due_date >= todayStr && t.due_date <= weekOutStr
      ).length
    : 0
  const doneRestOfQuarter = tracksDone
    ? activeProjects.flatMap(p =>
        p.tasks.filter(t => {
          if (t.status !== 'done') return false
          if (t.due_date && t.due_date > weekOutStr && t.due_date <= quarterEndStr) return true
          const proj = activeProjects.find(pr => pr.tasks.some(pt => pt.id === t.id))
          return !!proj && proj.target_year === year && proj.target_quarter === quarter && !t.due_date
        })
      ).length
    : 0

  function renderTask(t: UnifiedTask) {
    const project = t.projectId ? projects.find(p => p.id === t.projectId) ?? null : null
    return (
      <TaskRow
        key={t.id}
        task={t}
        project={project}
        goals={goals}
        isOwner={isOwner}
        allProjects={projects}
        onSelectProject={setSelectedProject}
      />
    )
  }

  return (
    <>
      <div className="space-y-8">
        {/* Category filter */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'suggested', 'ongoing', 'project'] as CategoryFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors capitalize ${
                filter === f
                  ? f === 'suggested' ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : f === 'ongoing'   ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : f === 'project'   ? 'bg-zinc-100 text-zinc-700 border border-zinc-300'
                  :                     'bg-zinc-900 text-white'
                  : 'text-zinc-400 hover:text-zinc-600 border border-transparent'
              }`}
            >
              {f === 'all' ? 'All' : CATEGORY_LABEL[f]}
            </button>
          ))}
        </div>

        {/* Loading state for suggestions */}
        {loadingSuggestions && (
          <p className="text-sm text-zinc-400 animate-pulse">Checking the forecast…</p>
        )}

        {/* Suggestions error */}
        {suggestionsError && (
          <p className="text-xs text-zinc-400">Weather unavailable: {suggestionsError}</p>
        )}

        {/* This Week */}
        {thisWeek.length > 0 && (
          <section className="space-y-2">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-600">
              This Week <span className="normal-case font-normal tracking-normal text-zinc-700 ml-1">{fmtDateRange(today, weekOut)}</span>
            </h2>
              <SectionProgress done={doneThisWeek} total={doneThisWeek + thisWeek.length} />
            </div>
            <ul className="space-y-2">
              {thisWeek.map(renderTask)}
            </ul>
          </section>
        )}

        {/* Rest of Quarter */}
        {restOfQuarter.length > 0 && (
          <section className="space-y-2">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-600">
              Rest of Q{quarter} <span className="normal-case font-normal tracking-normal text-zinc-700 ml-1">{fmtDateRange(weekOut, quarterEnd)}</span>
            </h2>
              <SectionProgress done={doneRestOfQuarter} total={doneRestOfQuarter + restOfQuarter.length} />
            </div>
            <ul className="space-y-2">
              {restOfQuarter.map(renderTask)}
            </ul>
          </section>
        )}

        {noTasks && (
          <p className="text-sm text-zinc-400 py-8 text-center">No active tasks this quarter. Nice work.</p>
        )}
      </div>

      <ProjectSlideOver
        project={selectedProject}
        goals={goals}
        allProjects={projects}
        isOwner={isOwner}
        onClose={() => setSelectedProject(null)}
      />
    </>
  )
}
