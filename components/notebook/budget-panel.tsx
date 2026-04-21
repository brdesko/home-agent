import type { Project } from './project-card'

export function BudgetPanel({ projects }: { projects: Project[] }) {
  const rows = projects
    .map(p => ({
      name:      p.name,
      estimated: p.budget_lines
        .reduce((sum, b) => sum + (b.estimated_amount ?? 0), 0),
    }))
    .filter(p => p.estimated > 0)

  if (rows.length === 0) return null

  const total = rows.reduce((sum, p) => sum + p.estimated, 0)

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-600">Budget (Estimated)</h2>
      <ul className="space-y-2">
        {rows.map(p => (
          <li key={p.name} className="flex items-baseline justify-between gap-2 text-sm">
            <span className="text-zinc-600 truncate">{p.name}</span>
            <span className="text-zinc-700 font-medium shrink-0 tabular-nums">${p.estimated.toLocaleString()}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-baseline justify-between border-t border-zinc-100 pt-2 text-sm">
        <span className="font-medium text-zinc-500">Total</span>
        <span className="font-semibold text-zinc-900 tabular-nums">${total.toLocaleString()}</span>
      </div>
    </div>
  )
}
