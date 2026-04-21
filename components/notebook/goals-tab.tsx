import { type Goal } from './goals-panel'
import { type Project } from './project-card'

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

const PROJECT_STATUS_STYLES: Record<string, string> = {
  planned:  'text-zinc-400',
  active:   'text-blue-600',
  on_hold:  'text-amber-600',
  complete: 'text-green-600',
}

type Props = {
  goals: GoalWithProgress[]
  projects: (Project & { goal_id: string | null })[]
}

export function GoalsTab({ goals, projects }: Props) {
  if (goals.length === 0) {
    return (
      <p className="text-sm text-zinc-400 py-8">No goals yet. Ask the Agent to add some.</p>
    )
  }

  const unlinked = projects.filter(p => !p.goal_id)

  return (
    <div className="space-y-6">
      {goals.map(goal => {
        const linked = projects.filter(p => p.goal_id === goal.id)
        const pct    = goal.totalProjects > 0
          ? Math.round((goal.completeProjects / goal.totalProjects) * 100)
          : 0

        return (
          <div key={goal.id} className="border border-zinc-200 rounded-lg p-5 space-y-4">
            {/* Goal header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[goal.priority] ?? 'bg-zinc-300'}`} />
                <h3 className="font-semibold text-zinc-900">{goal.name}</h3>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 capitalize ${STATUS_STYLES[goal.status] ?? 'bg-zinc-100 text-zinc-500'}`}>
                {goal.status}
              </span>
            </div>

            {goal.description && (
              <p className="text-sm text-zinc-500 leading-relaxed">{goal.description}</p>
            )}

            {/* Progress bar */}
            {goal.totalProjects > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>{goal.completeProjects} of {goal.totalProjects} project{goal.totalProjects !== 1 ? 's' : ''} complete</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-400 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )}

            {/* Linked projects */}
            {linked.length > 0 ? (
              <ul className="space-y-1.5 pt-1">
                {linked.map(p => (
                  <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-zinc-700">{p.name}</span>
                    <span className={`text-xs capitalize shrink-0 ${PROJECT_STATUS_STYLES[p.status] ?? 'text-zinc-400'}`}>
                      {p.status.replace('_', '\u00a0')}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-zinc-400 pt-1">No projects assigned yet.</p>
            )}
          </div>
        )
      })}

      {/* Unlinked projects */}
      {unlinked.length > 0 && (
        <div className="border border-dashed border-zinc-200 rounded-lg p-5 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Not assigned to a goal</h3>
          <ul className="space-y-1.5">
            {unlinked.map(p => (
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
