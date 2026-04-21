'use client'

import { useState } from 'react'

export type ParseResult = {
  summary: string
  propertyDetails: { field: string; label: string; value: string }[]
  assets: {
    name: string; assetType: string; make?: string; model?: string
    serialNumber?: string; installDate?: string; location?: string; notes?: string
  }[]
  suggestedProjects: {
    name: string; domain: string; description: string; priority: string
    tasks?: { title: string; description?: string }[]
  }[]
}

type Props = {
  result: ParseResult
  onClose: () => void
  onApplied: () => void
}

const NUMERIC_PROP_FIELDS = new Set(['year_built', 'sq_footage', 'acreage'])

// Convert "2015" or "circa 2010" to a valid date or null
function sanitizeDate(val: string | undefined): string | undefined {
  if (!val) return undefined
  const yearOnly = val.match(/^\d{4}$/)
  if (yearOnly) return `${val}-01-01`
  // If it looks like a valid date already, pass through; otherwise drop it
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val
  return undefined
}

export function ParseConfirmation({ result, onClose, onApplied }: Props) {
  const [propChecks,    setPropChecks]    = useState<boolean[]>(result.propertyDetails.map(() => true))
  const [propValues,    setPropValues]    = useState<string[]>(result.propertyDetails.map(d => d.value))
  const [assetChecks,   setAssetChecks]   = useState<boolean[]>(result.assets.map(() => true))
  const [projectChecks, setProjectChecks] = useState<boolean[]>(result.suggestedProjects.map(() => true))
  const [taskChecks,    setTaskChecks]    = useState<boolean[][]>(
    result.suggestedProjects.map(p => (p.tasks ?? []).map(() => true))
  )
  const [applying,      setApplying]      = useState(false)
  const [errors,        setErrors]        = useState<string[]>([])

  async function apply() {
    setApplying(true); setErrors([])
    const errs: string[] = []

    // Property details — coerce numeric fields
    const propFields: Record<string, unknown> = {}
    result.propertyDetails.forEach((d, i) => {
      if (!propChecks[i]) return
      const raw = propValues[i]
      propFields[d.field] = NUMERIC_PROP_FIELDS.has(d.field) ? (parseFloat(raw) || null) : raw
    })
    if (Object.keys(propFields).length > 0) {
      const res = await fetch('/api/property', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(propFields),
      })
      if (!res.ok) { const b = await res.json(); errs.push(`Property details: ${b.error}`) }
    }

    // Assets — sanitize dates
    for (let i = 0; i < result.assets.length; i++) {
      if (!assetChecks[i]) continue
      const a = result.assets[i]
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:             a.name,
          asset_type:       a.assetType,
          make:             a.make             || undefined,
          model:            a.model            || undefined,
          serial_number:    a.serialNumber     || undefined,
          install_date:     sanitizeDate(a.installDate),
          location:         a.location         || undefined,
          notes:            a.notes            || undefined,
        }),
      })
      if (!res.ok) { const b = await res.json(); errs.push(`Asset "${a.name}": ${b.error}`) }
    }

    // Projects + tasks
    for (let i = 0; i < result.suggestedProjects.length; i++) {
      if (!projectChecks[i]) continue
      const p = result.suggestedProjects[i]
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: p.name, domain: p.domain, status: 'planned',
          priority: p.priority, description: p.description,
        }),
      })
      if (!res.ok) { const b = await res.json(); errs.push(`Project "${p.name}": ${b.error}`); continue }
      const { id: projectId } = await res.json()

      // Create checked tasks for this project
      const tasks = p.tasks ?? []
      for (let j = 0; j < tasks.length; j++) {
        if (!taskChecks[i]?.[j]) continue
        const t = tasks[j]
        const tRes = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project_id: projectId, title: t.title, description: t.description || undefined }),
        })
        if (!tRes.ok) { const b = await tRes.json(); errs.push(`Task "${t.title}": ${b.error}`) }
      }
    }

    setApplying(false)
    if (errs.length > 0) { setErrors(errs); return }
    onApplied()
  }

  const totalChecked =
    propChecks.filter(Boolean).length +
    assetChecks.filter(Boolean).length +
    projectChecks.filter(Boolean).length +
    taskChecks.flat().filter(Boolean).length

  const inp = 'text-sm border border-zinc-200 rounded-md px-2 py-1 focus:outline-none focus:border-zinc-400 bg-white w-full'

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-black/30 z-40" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

          {/* Header */}
          <div className="flex items-start justify-between px-6 py-4 border-b border-zinc-100 shrink-0">
            <div>
              <h2 className="font-semibold text-zinc-900">Review what the Agent found</h2>
              <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{result.summary}</p>
            </div>
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 text-xl ml-4 shrink-0">✕</button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

            {/* Errors — shown at top so they're never missed */}
            {errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 space-y-1">
                <p className="text-xs font-semibold text-red-700">Some items failed to save:</p>
                {errors.map((e, i) => <p key={i} className="text-xs text-red-600">{e}</p>)}
              </div>
            )}

            {/* Property details */}
            {result.propertyDetails.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-600 mb-3">Property Details</h3>
                <div className="space-y-2">
                  {result.propertyDetails.map((d, i) => (
                    <label key={d.field} className="flex items-center gap-3">
                      <input type="checkbox" checked={propChecks[i]}
                        onChange={e => setPropChecks(c => c.map((v, j) => j === i ? e.target.checked : v))}
                        className="w-4 h-4 rounded shrink-0" />
                      <span className="text-sm text-zinc-600 w-36 shrink-0">{d.label}</span>
                      <input value={propValues[i]}
                        onChange={e => setPropValues(v => v.map((x, j) => j === i ? e.target.value : x))}
                        className={inp} />
                    </label>
                  ))}
                </div>
              </section>
            )}

            {/* Assets */}
            {result.assets.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-600 mb-3">Assets to Add</h3>
                <div className="space-y-2">
                  {result.assets.map((a, i) => (
                    <label key={i} className="flex items-start gap-3 border border-zinc-100 rounded-lg p-3 cursor-pointer hover:bg-zinc-50">
                      <input type="checkbox" checked={assetChecks[i]}
                        onChange={e => setAssetChecks(c => c.map((v, j) => j === i ? e.target.checked : v))}
                        className="w-4 h-4 rounded mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-800">{a.name}</p>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {[a.assetType, a.make, a.model, a.installDate ? `installed ${a.installDate}` : '', a.location]
                            .filter(Boolean).join(' · ')}
                        </p>
                        {a.notes && <p className="text-xs text-zinc-400 mt-0.5 italic">{a.notes}</p>}
                      </div>
                    </label>
                  ))}
                </div>
              </section>
            )}

            {/* Projects */}
            {result.suggestedProjects.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-600 mb-3">Suggested Projects</h3>
                <div className="space-y-3">
                  {result.suggestedProjects.map((p, i) => (
                    <div key={i} className="border border-zinc-100 rounded-lg overflow-hidden">
                      {/* Project row */}
                      <label className="flex items-start gap-3 p-3 cursor-pointer hover:bg-zinc-50">
                        <input type="checkbox" checked={projectChecks[i]}
                          onChange={e => setProjectChecks(c => c.map((v, j) => j === i ? e.target.checked : v))}
                          className="w-4 h-4 rounded mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-zinc-800">{p.name}</p>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                              p.priority === 'high' ? 'bg-red-50 text-red-600' :
                              p.priority === 'medium' ? 'bg-amber-50 text-amber-600' :
                              'bg-zinc-100 text-zinc-500'
                            }`}>{p.priority}</span>
                          </div>
                          <p className="text-xs text-zinc-400 mt-0.5">{p.domain} · {p.description}</p>
                        </div>
                      </label>

                      {/* Tasks */}
                      {(p.tasks ?? []).length > 0 && (
                        <div className="border-t border-zinc-100 bg-zinc-50 px-3 py-2 space-y-1.5">
                          <p className="text-xs text-zinc-400 font-medium mb-1">Starter tasks</p>
                          {(p.tasks ?? []).map((t, j) => (
                            <label key={j} className="flex items-center gap-2.5 cursor-pointer">
                              <input type="checkbox"
                                checked={taskChecks[i]?.[j] ?? true}
                                onChange={e => setTaskChecks(tc =>
                                  tc.map((row, ri) => ri === i ? row.map((v, ci) => ci === j ? e.target.checked : v) : row)
                                )}
                                className="w-3.5 h-3.5 rounded shrink-0" />
                              <span className="text-xs text-zinc-600">{t.title}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {result.propertyDetails.length === 0 && result.assets.length === 0 && result.suggestedProjects.length === 0 && (
              <p className="text-sm text-zinc-400 text-center py-8">No structured data found in this source.</p>
            )}

          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-zinc-100 flex items-center gap-3 shrink-0">
            <button onClick={apply} disabled={applying || totalChecked === 0}
              className="px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg disabled:opacity-40 hover:bg-zinc-700 transition-colors">
              {applying ? 'Applying…' : `Apply ${totalChecked} item${totalChecked !== 1 ? 's' : ''}`}
            </button>
            <button onClick={onClose} className="text-sm text-zinc-500 hover:text-zinc-800">Cancel</button>
          </div>
        </div>
      </div>
    </>
  )
}
