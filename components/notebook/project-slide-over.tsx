'use client'

import { useEffect } from 'react'
import { type Project } from './project-card'
import { type Goal } from './goals-panel'
import { quarterLabel, fmtCurrency } from './quarter-utils'

const STATUS_STYLES: Record<string, string> = {
  planned:  'bg-zinc-100 text-zinc-600',
  active:   'bg-blue-50 text-blue-700',
  on_hold:  'bg-amber-50 text-amber-700',
  complete: 'bg-green-50 text-green-700',
}

const EFFORT_LABEL: Record<string, string> = {
  low: 'Low effort', medium: 'Medium effort', high: 'High effort', very_high: 'Very high effort',
}

const PRIORITY_DOT: Record<string, string> = {
  high: 'bg-red-400', medium: 'bg-amber-400', low: 'bg-zinc-300',
}

const TASK_DOT: Record<string, string> = {
  todo:        'border-zinc-300 bg-white',
  in_progress: 'border-blue-400 bg-blue-100',
  done:        'border-green-400 bg-green-400',
  blocked:     'border-red-400 bg-red-100',
}

function shortDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

type Props = {
  project: (Project & { goal_id: string | null }) | null
  goals: Goal[]
  isOwner: boolean
  onClose: () => void
}

export function ProjectSlideOver({ project, goals, isOwner, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const open = !!project

  const activeTasks = project?.tasks.filter(t => t.status !== 'done') ?? []
  const doneTasks   = project?.tasks.filter(t => t.status === 'done') ?? []
  const estimated   = project?.budget_lines.filter(b => b.line_type === 'estimated') ?? []
  const actual      = project?.budget_lines.filter(b => b.line_type === 'actual') ?? []
  const goal        = project?.goal_id ? goals.find(g => g.id === project.goal_id) : null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/20 z-40 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Panel */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-xl z-50 flex flex-col transition-transform duration-200 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
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
                  <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 capitalize">
                    {project.domain}
                  </span>
                  {project.effort && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500">
                      {EFFORT_LABEL[project.effort]}
                    </span>
                  )}
                  {project.target_year && project.target_quarter && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500">
                      {quarterLabel(project.target_year, project.target_quarter)}
                    </span>
                  )}
                </div>
                {goal && (
                  <p className="text-xs text-zinc-400">Goal: {goal.name}</p>
                )}
              </div>
              <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 transition-colors text-xl leading-none shrink-0 mt-0.5">✕</button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Description */}
              {project.description && (
                <p className="text-sm text-zinc-600 leading-relaxed">{project.description}</p>
              )}

              {/* Tasks */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Tasks</h3>
                {activeTasks.length === 0 && doneTasks.length === 0 ? (
                  <p className="text-xs text-zinc-400">No tasks yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {activeTasks.map(t => (
                      <li key={t.id} className="flex items-center gap-2.5 text-sm">
                        <span className={`w-3 h-3 rounded-full border-2 shrink-0 ${TASK_DOT[t.status] ?? TASK_DOT.todo}`} />
                        <span className="flex-1 text-zinc-700">{t.title}</span>
                        {t.due_date && <span className="text-xs text-zinc-400 shrink-0">{shortDate(t.due_date)}</span>}
                      </li>
                    ))}
                    {doneTasks.length > 0 && (
                      <li className="text-xs text-zinc-400">{doneTasks.length} task{doneTasks.length !== 1 ? 's' : ''} done</li>
                    )}
                  </ul>
                )}
              </div>

              {/* Budget lines (owner only) */}
              {isOwner && (estimated.length > 0 || actual.length > 0) && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Budget</h3>
                  <div className="space-y-1.5">
                    {estimated.map(b => (
                      <div key={b.id} className="flex items-center justify-between text-sm">
                        <span className="text-zinc-600">{b.description}</span>
                        <span className="text-zinc-500 text-xs">{fmtCurrency(b.amount)} est.</span>
                      </div>
                    ))}
                    {actual.map(b => (
                      <div key={b.id} className="flex items-center justify-between text-sm">
                        <span className="text-zinc-600">{b.description}</span>
                        <span className="text-zinc-500 text-xs">{fmtCurrency(b.amount)} actual</span>
                      </div>
                    ))}
                    <div className="border-t border-zinc-100 pt-2 flex justify-between text-xs font-medium text-zinc-700">
                      <span>Estimated total</span>
                      <span>{fmtCurrency(estimated.reduce((s, b) => s + b.amount, 0))}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Timeline events */}
              {project.timeline_events.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Timeline</h3>
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
          </>
        )}
      </div>
    </>
  )
}
