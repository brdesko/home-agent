type Task = {
  id: string
  title: string
  status: string
  due_date: string | null
}

type BudgetLine = {
  id: string
  amount: number
  line_type: string
}

export type Project = {
  id: string
  name: string
  domain: string
  status: string
  priority: string
  description: string | null
  tasks: Task[]
  budget_lines: BudgetLine[]
}

const STATUS_STYLES: Record<string, string> = {
  planned:  'bg-zinc-100 text-zinc-600',
  active:   'bg-blue-50 text-blue-700',
  on_hold:  'bg-amber-50 text-amber-700',
  complete: 'bg-green-50 text-green-700',
}

const PRIORITY_DOT: Record<string, string> = {
  high:   'bg-red-400',
  medium: 'bg-amber-400',
  low:    'bg-zinc-300',
}

const TASK_STYLES: Record<string, string> = {
  todo:        'text-zinc-500',
  in_progress: 'text-blue-600',
  done:        'text-zinc-400 line-through',
  blocked:     'text-red-500',
}

const TASK_LABELS: Record<string, string> = {
  todo:        'to do',
  in_progress: 'in progress',
  done:        'done',
  blocked:     'blocked',
}

function shortDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function ProjectCard({ project, isOwner }: { project: Project; isOwner: boolean }) {
  const activeTasks = project.tasks.filter(t => t.status !== 'done')
  const doneCount   = project.tasks.filter(t => t.status === 'done').length

  const estimated = project.budget_lines
    .filter(b => b.line_type === 'estimated')
    .reduce((sum, b) => sum + b.amount, 0)

  return (
    <div className="border border-zinc-200 rounded-lg p-4 space-y-3">
      {/* Title row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[project.priority] ?? 'bg-zinc-300'}`} />
          <h3 className="font-medium text-zinc-900 leading-snug">{project.name}</h3>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 capitalize ${STATUS_STYLES[project.status] ?? 'bg-zinc-100 text-zinc-600'}`}>
          {project.status.replace('_', '\u00a0')}
        </span>
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-sm text-zinc-500 leading-relaxed">{project.description}</p>
      )}

      {/* Tasks */}
      {project.tasks.length > 0 && (
        <ul className="space-y-1.5 border-t border-zinc-100 pt-3">
          {activeTasks.map(task => (
            <li key={task.id} className="flex items-baseline justify-between gap-3 text-sm">
              <span className={`flex-1 min-w-0 ${TASK_STYLES[task.status] ?? 'text-zinc-500'}`}>
                {task.title}
              </span>
              <span className="text-xs text-zinc-400 shrink-0 flex items-center gap-1">
                {task.due_date && <span>{shortDate(task.due_date)}</span>}
                {task.due_date && <span className="text-zinc-300">·</span>}
                <span>{TASK_LABELS[task.status] ?? task.status}</span>
              </span>
            </li>
          ))}
          {doneCount > 0 && (
            <li className="text-xs text-zinc-400 pt-0.5">
              {doneCount} task{doneCount !== 1 ? 's' : ''} done
            </li>
          )}
        </ul>
      )}

      {/* Budget total */}
      {isOwner && estimated > 0 && (
        <div className="flex items-center justify-between border-t border-zinc-100 pt-3">
          <span className="text-xs text-zinc-400">Estimated budget</span>
          <span className="text-sm font-medium text-zinc-700">${estimated.toLocaleString()}</span>
        </div>
      )}
    </div>
  )
}
