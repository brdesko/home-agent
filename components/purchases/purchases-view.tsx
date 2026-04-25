'use client'

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { PurchasePanel, type Purchase } from './purchase-panel'

const SAGE = 'oklch(0.50 0.10 155)'

type Project = { id: string; name: string }

type Props = {
  initialPurchases: Purchase[]
  projects: Project[]
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function monthKey(iso: string) {
  const [y, m] = iso.split('-')
  return `${y}-${m}`
}

function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function fmtPrice(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
}

export function PurchasesView({ initialPurchases, projects }: Props) {
  const [purchases, setPurchases] = useState<Purchase[]>(initialPurchases)
  const [selected,  setSelected]  = useState<Purchase | null>(null)
  const [isNew,     setIsNew]     = useState(false)
  const [search,    setSearch]    = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [projFilter, setProjFilter] = useState('')

  const today = new Date().toISOString().split('T')[0]

  function openNew() { setSelected(null); setIsNew(true) }
  function openEdit(p: Purchase) { setSelected(p); setIsNew(false) }
  function closePanel() { setSelected(null); setIsNew(false) }

  function handleSave(updated: Purchase) {
    setPurchases(prev => {
      const exists = prev.find(p => p.id === updated.id)
      const next = exists
        ? prev.map(p => p.id === updated.id ? updated : p)
        : [updated, ...prev]
      return next.sort((a, b) => b.purchased_at.localeCompare(a.purchased_at) || b.created_at.localeCompare(a.created_at))
    })
    closePanel()
  }

  function handleDelete(id: string) {
    setPurchases(prev => prev.filter(p => p.id !== id))
    closePanel()
  }

  // Derived stats
  const totalSpend  = purchases.reduce((s, p) => s + (p.price ?? 0), 0)
  const vendorCount = new Set(purchases.map(p => p.vendor).filter(Boolean)).size

  // Top category by spend
  const spendByCategory = useMemo(() => {
    const m: Record<string, number> = {}
    for (const p of purchases) {
      if (p.category && p.price) m[p.category] = (m[p.category] ?? 0) + p.price
    }
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }, [purchases])

  // Unique categories for filter
  const categories = useMemo(() =>
    [...new Set(purchases.map(p => p.category).filter(Boolean) as string[])].sort()
  , [purchases])

  // Filtered list
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return purchases.filter(p => {
      if (q && !p.item_name.toLowerCase().includes(q) && !(p.vendor ?? '').toLowerCase().includes(q)) return false
      if (catFilter  && p.category  !== catFilter)  return false
      if (projFilter && p.project_id !== projFilter) return false
      return true
    })
  }, [purchases, search, catFilter, projFilter])

  // Group by month
  const grouped = useMemo(() => {
    const months: { key: string; items: Purchase[] }[] = []
    for (const p of filtered) {
      const key = monthKey(p.purchased_at)
      const existing = months.find(m => m.key === key)
      if (existing) existing.items.push(p)
      else months.push({ key, items: [p] })
    }
    return months
  }, [filtered])

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="px-8 pt-7 pb-4 border-b border-zinc-100">
          <div className="flex items-center justify-between">
            <h1 className="text-[28px] font-display text-zinc-800 leading-tight">Purchases</h1>
            <button onClick={openNew}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: SAGE }}>
              + Log purchase
            </button>
          </div>

          {/* Stats bar */}
          {purchases.length > 0 && (
            <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
              <span className="font-semibold text-zinc-700">{fmtPrice(totalSpend)} total</span>
              <span className="text-zinc-200">·</span>
              <span>{purchases.length} item{purchases.length !== 1 ? 's' : ''}</span>
              {vendorCount > 0 && <>
                <span className="text-zinc-200">·</span>
                <span>{vendorCount} vendor{vendorCount !== 1 ? 's' : ''}</span>
              </>}
              {spendByCategory[0] && <>
                <span className="text-zinc-200">·</span>
                <span>Top category: {spendByCategory[0][0]} ({fmtPrice(spendByCategory[0][1])})</span>
              </>}
            </div>
          )}
        </div>

        <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">

          {/* Filters */}
          <div className="flex gap-3 items-center">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search items or vendors…"
                className="w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-lg text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-200" />
            </div>
            {categories.length > 0 && (
              <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
                className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-200 bg-white">
                <option value="">All categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            {projects.length > 0 && (
              <select value={projFilter} onChange={e => setProjFilter(e.target.value)}
                className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-200 bg-white">
                <option value="">All projects</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
          </div>

          {/* Category spend breakdown */}
          {spendByCategory.length > 1 && !catFilter && !projFilter && !search && (
            <div className="flex flex-wrap gap-2">
              {spendByCategory.slice(0, 6).map(([cat, spend]) => (
                <button key={cat} onClick={() => setCatFilter(cat)}
                  className="px-2.5 py-1 rounded-full text-xs border border-zinc-200 text-zinc-600 hover:border-zinc-400 transition-colors">
                  {cat} · {fmtPrice(spend)}
                </button>
              ))}
            </div>
          )}

          {/* Purchase list */}
          {filtered.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center bg-zinc-100">
                <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                </svg>
              </div>
              <div className="space-y-1">
                <p className="text-zinc-500 text-sm font-medium">
                  {purchases.length === 0 ? 'No purchases logged yet.' : 'No purchases match your filters.'}
                </p>
                {purchases.length === 0 && (
                  <p className="text-zinc-400 text-xs">
                    Log a purchase or ask the Agent to record one for you.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {grouped.map(({ key, items }) => {
                const monthTotal = items.reduce((s, p) => s + (p.price ?? 0), 0)
                return (
                  <section key={key}>
                    <div className="flex items-baseline justify-between mb-3">
                      <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-600">{monthLabel(key)}</h2>
                      {monthTotal > 0 && (
                        <span className="text-xs text-zinc-400">{fmtPrice(monthTotal)}</span>
                      )}
                    </div>
                    <div className="space-y-1">
                      {items.map(p => (
                        <button key={p.id} onClick={() => openEdit(p)}
                          className="w-full text-left flex items-start gap-4 px-4 py-3 rounded-lg hover:bg-zinc-50 transition-colors group">
                          <span className="text-xs text-zinc-400 tabular-nums w-14 shrink-0 mt-0.5">{fmtDate(p.purchased_at)}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-zinc-700 leading-snug">{p.item_name}</span>
                              {p.category && (
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-500">{p.category}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {p.vendor && <span className="text-xs text-zinc-400">{p.vendor}</span>}
                              {p.projects?.name && (
                                <>
                                  {p.vendor && <span className="text-zinc-200 text-xs">·</span>}
                                  <span className="text-xs text-zinc-400">{p.projects.name}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <span className="text-sm font-medium text-zinc-600 shrink-0 tabular-nums">
                            {p.price != null ? fmtPrice(p.price) : <span className="text-zinc-300">—</span>}
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <PurchasePanel
        purchase={selected}
        isNew={isNew}
        defaultDate={today}
        projects={projects}
        onClose={closePanel}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </>
  )
}
