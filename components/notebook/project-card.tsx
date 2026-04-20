import { TaskList, type Task } from './task-list'

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

export function ProjectCard({ project, isOwner }: { project: Project; isOwner: boolean }) {
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
        <div className="border-t border-zinc-100 pt-3">
          <TaskList tasks={project.tasks} projectName={project.name} />
        </div>
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
