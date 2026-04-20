'use client'

import { useState } from 'react'

export type Task = {
  id: string
  title: string
  status: string
  due_date: string | null
}

const STATUS_CYCLE: Record<string, string> = {
  todo:        'in_progress',
  in_progress: 'done',
  done:        'todo',
  blocked:     'todo',
}

const DOT_STYLES: Record<string, string> = {
  todo:        'border-zinc-300 bg-white hover:border-zinc-400',
  in_progress: 'border-blue-400 bg-blue-100 hover:border-blue-500',
  done:        'border-green-400 bg-green-400 hover:border-green-500',
  blocked:     'border-red-400 bg-red-100 hover:border-red-500',
}

const TEXT_STYLES: Record<string, string> = {
  todo:        'text-zinc-600',
  in_progress: 'text-blue-700',
  done:        'text-zinc-400 line-through',
  blocked:     'text-red-500',
}

function shortDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function TaskList({ tasks }: { tasks: Task[] }) {
  const [statuses, setStatuses] = useState<Record<string, string>>(
    Object.fromEntries(tasks.map(t => [t.id, t.status]))
  )
  const [updating, setUpdating] = useState<string | null>(null)

  async function cycleStatus(taskId: string) {
    if (updating) return
    const current = statuses[taskId]
    const next = STATUS_CYCLE[current] ?? 'todo'

    setUpdating(taskId)
    setStatuses(prev => ({ ...prev, [taskId]: next }))

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) setStatuses(prev => ({ ...prev, [taskId]: current }))
    } catch {
      setStatuses(prev => ({ ...prev, [taskId]: current }))
    } finally {
      setUpdating(null)
    }
  }

  const active = tasks.filter(t => statuses[t.id] !== 'done')
  const done   = tasks.filter(t => statuses[t.id] === 'done')

  return (
    <ul className="space-y-1.5">
      {active.map(task => {
        const status = statuses[task.id]
        return (
          <li key={task.id} className="flex items-center gap-2.5 text-sm">
            <button
              onClick={() => cycleStatus(task.id)}
              disabled={updating === task.id}
              title={`${status} — click to advance`}
              className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 transition-colors cursor-pointer disabled:opacity-40 ${DOT_STYLES[status] ?? DOT_STYLES.todo}`}
            />
            <span className={`flex-1 min-w-0 ${TEXT_STYLES[status] ?? 'text-zinc-600'}`}>
              {task.title}
            </span>
            {task.due_date && (
              <span className="text-xs text-zinc-400 shrink-0">{shortDate(task.due_date)}</span>
            )}
          </li>
        )
      })}
      {done.length > 0 && (
        <li className="flex items-center gap-2.5 text-sm">
          <button
            onClick={() => done.forEach(t => cycleStatus(t.id))}
            disabled={!!updating}
            title="All done — click to reopen all"
            className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 transition-colors cursor-pointer disabled:opacity-40 ${DOT_STYLES.done}`}
          />
          <span className="text-zinc-400 text-xs">
            {done.length} task{done.length !== 1 ? 's' : ''} done
          </span>
        </li>
      )}
    </ul>
  )
}
