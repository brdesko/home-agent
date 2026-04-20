'use client'

import { useState } from 'react'
import Link from 'next/link'

export type Task = {
  id: string
  title: string
  status: string
  due_date: string | null
}

type FollowUp = {
  taskId: string
  question: string
  answered: boolean
}

const STATUS_CYCLE: Record<string, string> = {
  todo:        'in_progress',
  in_progress: 'done',
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

export function TaskList({ tasks, projectName, projectId }: { tasks: Task[]; projectName: string; projectId: string }) {
  const [statuses, setStatuses] = useState<Record<string, string>>(
    Object.fromEntries(tasks.map(t => [t.id, t.status]))
  )
  const [updating, setUpdating]   = useState<string | null>(null)
  const [followUp, setFollowUp]   = useState<FollowUp | null>(null)
  const [followUpText, setFollowUpText] = useState('')
  const [noting, setNoting]       = useState(false)
  const [noted, setNoted]         = useState(false)
  const [agentUrl, setAgentUrl]   = useState('/agent')

  async function handleDone(taskId: string) {
    if (updating) return
    setUpdating(taskId)
    setStatuses(prev => ({ ...prev, [taskId]: 'done' }))
    setFollowUp(null)
    setNoted(false)
    setFollowUpText('')

    try {
      const res = await fetch(`/api/tasks/${taskId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName }),
      })
      if (!res.ok) {
        setStatuses(prev => ({ ...prev, [taskId]: 'in_progress' }))
        return
      }
      const data = await res.json()
      if (data.followUp) {
        setFollowUp({ taskId, question: data.followUp, answered: false })
      }
    } catch {
      setStatuses(prev => ({ ...prev, [taskId]: 'in_progress' }))
    } finally {
      setUpdating(null)
    }
  }

  async function cycleStatus(taskId: string) {
    if (updating) return
    const current = statuses[taskId]

    // Completing a task goes through the follow-up path
    if (current === 'in_progress') {
      await handleDone(taskId)
      return
    }

    // done → todo (un-complete)
    if (current === 'done') {
      setUpdating(taskId)
      setStatuses(prev => ({ ...prev, [taskId]: 'todo' }))
      setFollowUp(null)
      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'todo' }),
        })
        if (!res.ok) setStatuses(prev => ({ ...prev, [taskId]: 'done' }))
      } catch {
        setStatuses(prev => ({ ...prev, [taskId]: 'done' }))
      } finally {
        setUpdating(null)
      }
      return
    }

    // All other transitions
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

  async function submitNote() {
    if (!followUpText.trim() || noting || !followUp) return
    setNoting(true)
    await new Promise(r => setTimeout(r, 200))
    const task = tasks.find(t => t.id === followUp.taskId)
    const ctx = [
      `I just completed "${task?.title ?? followUp.taskId}" in the ${projectName} project (project_id: ${projectId}).`,
      `You asked: "${followUp.question}"`,
      `Here's what happened: ${followUpText.trim()}`,
      `Please review all projects and tasks across the full Notebook and suggest any cascade changes — or a new project if warranted — given this outcome.`,
    ].join(' ')
    const title = task?.title ?? ''
    setAgentUrl(`/agent?ctx=${encodeURIComponent(ctx)}&taskTitle=${encodeURIComponent(title)}`)
    setNoted(true)
    setNoting(false)
  }

  const active = tasks.filter(t => statuses[t.id] !== 'done')
  const done   = tasks.filter(t => statuses[t.id] === 'done')

  return (
    <div className="space-y-2">
      <ul className="space-y-1.5">
        {active.map(task => {
          const status = statuses[task.id]
          const isUpdating = updating === task.id
          return (
            <li key={task.id} className="flex items-center gap-2.5 text-sm">
              <button
                onClick={() => cycleStatus(task.id)}
                disabled={!!updating}
                title={`${status} — click to advance`}
                className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 transition-colors cursor-pointer disabled:opacity-40 ${isUpdating ? 'animate-pulse' : ''} ${DOT_STYLES[status] ?? DOT_STYLES.todo}`}
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
              title="Click to reopen all"
              className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 transition-colors cursor-pointer disabled:opacity-40 ${DOT_STYLES.done}`}
            />
            <span className="text-zinc-400 text-xs">
              {done.length} task{done.length !== 1 ? 's' : ''} done
            </span>
          </li>
        )}
      </ul>

      {/* Follow-up prompt */}
      {followUp && !noted && (
        <div className="mt-3 border border-zinc-200 rounded-lg p-3 space-y-2 bg-zinc-50">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Agent follow-up</p>
          <p className="text-sm text-zinc-700">{followUp.question}</p>
          <textarea
            value={followUpText}
            onChange={e => setFollowUpText(e.target.value)}
            placeholder="Share what happened…"
            rows={2}
            className="w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 bg-white"
          />
          <div className="flex gap-2">
            <button
              onClick={submitNote}
              disabled={!followUpText.trim() || noting}
              className="px-3 py-1.5 bg-zinc-900 text-white text-xs font-medium rounded-lg disabled:opacity-40 hover:bg-zinc-700 transition-colors"
            >
              {noting ? 'Noting…' : 'Note it'}
            </button>
            <button
              onClick={() => setFollowUp(null)}
              className="px-3 py-1.5 text-zinc-500 text-xs hover:text-zinc-700 transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {noted && (
        <div className="mt-3 border border-green-200 rounded-lg px-3 py-2 bg-green-50 flex items-center justify-between gap-3">
          <p className="text-xs text-green-700">Noted. Open the Agent to discuss next steps.</p>
          <Link href={agentUrl} className="text-xs text-green-700 underline underline-offset-2 hover:text-green-900 shrink-0">
            Open Agent →
          </Link>
        </div>
      )}
    </div>
  )
}
