export type Goal = {
  id: string
  name: string
  description: string | null
  status: string
  priority: string
}

type GoalWithProgress = Goal & {
  totalProjects: number
  activeProjects: number
  completeProjects: number
}

const PRIORITY_DOT: Record<string, string> = {
  high:   'bg-red-400',
  medium: 'bg-amber-400',
  low:    'bg-zinc-300',
}

const STATUS_STYLES: Record<string, string> = {
  active:   'bg-blue-50 text-blue-700',
  complete: 'bg-green-50 text-green-700',
  paused:   'bg-zinc-100 text-zinc-500',
}

export function GoalsPanel({ goals }: { goals: GoalWithProgress[] }) {
  if (goals.length === 0) return null

  return (
    <section className="border-b border-zinc-100 px-6 py-5">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">Goals</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {goals.map(goal => (
            <div key={goal.id} className="border border-zinc-200 rounded-lg px-4 py-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[goal.priority] ?? 'bg-zinc-300'}`} />
                  <span className="font-medium text-sm text-zinc-900 truncate">{goal.name}</span>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLES[goal.status] ?? 'bg-zinc-100 text-zinc-500'}`}>
                  {goal.status}
                </span>
              </div>

              {goal.totalProjects > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>
                      {goal.completeProjects} of {goal.totalProjects} project{goal.totalProjects !== 1 ? 's' : ''} complete
                    </span>
                    <span>{Math.round((goal.completeProjects / goal.totalProjects) * 100)}%</span>
                  </div>
                  <div className="h-1 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-400 rounded-full transition-all"
                      style={{ width: `${Math.round((goal.completeProjects / goal.totalProjects) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {goal.totalProjects === 0 && (
                <p className="text-xs text-zinc-400">No projects assigned yet.</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
