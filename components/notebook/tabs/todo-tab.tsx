'use client'

import { useState, useEffect } from 'react'
import { type Project } from '../project-card'
import { getCurrentQuarter } from '../quarter-utils'

const TASK_DOT: Record<string, string> = {
  todo:        'border-zinc-300 bg-white',
  in_progress: 'border-blue-400 bg-blue-100',
  blocked:     'border-red-400 bg-red-100',
}

function shortDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

type FlatTask = {
  id: string
  title: string
  status: string
  due_date: string | null
  projectName: string
  domain: string
}

type Props = {
  projects: (Project & { goal_id: string | null })[]
}

export function TodoTab({ projects }: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(true)
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/suggestions')
      .then(r => r.json())
      .then(d => {
        setSuggestions(d.suggestions ?? [])
        if (d.weatherError) setSuggestionsError(d.weatherError)
        setLoadingSuggestions(false)
      })
      .catch(e => {
        setSuggestionsError(String(e))
        setLoadingSuggestions(false)
      })
  }, [])

  const { year, quarter } = getCurrentQuarter()
  const today = new Date()
  const weekOut = new Date(today)
  weekOut.setDate(today.getDate() + 7)
  const todayStr   = today.toISOString().split('T')[0]
  const weekOutStr = weekOut.toISOString().split('T')[0]

  // Flatten all active tasks across all projects
  const allTasks: FlatTask[] = projects.flatMap(p =>
    p.tasks
      .filter(t => t.status !== 'done')
      .map(t => ({ ...t, projectName: p.name, domain: p.domain }))
  )

  const thisWeek = allTasks.filter(
    t => t.due_date && t.due_date >= todayStr && t.due_date <= weekOutStr
  ).sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))

  const thisQuarterProjects = projects.filter(
    p => p.target_year === year && p.target_quarter === quarter
  )
  const thisQuarterTasks = thisQuarterProjects.flatMap(p =>
    p.tasks
      .filter(t => t.status !== 'done')
      .map(t => ({ ...t, projectName: p.name, domain: p.domain }))
  )

  // Remaining tasks not captured above (active, no due date, not in quarter projects)
  const quarterId = new Set(thisQuarterProjects.map(p => p.id))
  const weekTaskIds = new Set(thisWeek.map(t => t.id))
  const otherTasks = allTasks.filter(
    t => !weekTaskIds.has(t.id) && !quarterId.has(
      projects.find(p => p.tasks.some(pt => pt.id === t.id))?.id ?? ''
    )
  )

  return (
    <div className="space-y-8">
      {/* Suggestions */}
      <section className="border border-zinc-200 rounded-lg p-5 space-y-3 bg-zinc-50">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Suggestions</h2>
        {loadingSuggestions ? (
          <p className="text-sm text-zinc-400 animate-pulse">Checking the forecast…</p>
        ) : suggestionsError ? (
          <p className="text-sm text-zinc-400">Weather unavailable: <span className="text-zinc-300 text-xs">{suggestionsError}</span></p>
        ) : suggestions.length === 0 ? (
          <p className="text-sm text-zinc-400">No suggestions at the moment.</p>
        ) : (
          <ul className="space-y-2">
            {suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-700">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                {s}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* This week */}
      {thisWeek.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Due This Week</h2>
          <ul className="space-y-2">
            {thisWeek.map(t => (
              <TaskRow key={t.id} task={t} />
            ))}
          </ul>
        </section>
      )}

      {/* This quarter */}
      {thisQuarterTasks.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Q{quarter} {year} — Current Quarter
          </h2>
          <ul className="space-y-2">
            {thisQuarterTasks.map(t => (
              <TaskRow key={t.id} task={t} />
            ))}
          </ul>
        </section>
      )}

      {/* Other active tasks */}
      {otherTasks.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Other Active Tasks</h2>
          <ul className="space-y-2">
            {otherTasks.map(t => (
              <TaskRow key={t.id} task={t} />
            ))}
          </ul>
        </section>
      )}

      {allTasks.length === 0 && (
        <p className="text-sm text-zinc-400 py-8 text-center">No active tasks. Nice work.</p>
      )}
    </div>
  )
}

function TaskRow({ task }: { task: FlatTask }) {
  return (
    <li className="flex items-center gap-2.5 text-sm border border-zinc-100 rounded-lg px-3 py-2.5">
      <span className={`w-3 h-3 rounded-full border-2 shrink-0 ${TASK_DOT[task.status] ?? TASK_DOT.todo}`} />
      <span className="flex-1 text-zinc-700">{task.title}</span>
      <span className="text-xs text-zinc-400 shrink-0">{task.projectName}</span>
      {task.due_date && (
        <span className="text-xs text-zinc-400 shrink-0">{shortDate(task.due_date)}</span>
      )}
    </li>
  )
}
