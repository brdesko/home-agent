'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Trash2 } from 'lucide-react'

const SAGE = 'oklch(0.50 0.10 155)'

export type Purchase = {
  id: string
  item_name: string
  vendor: string | null
  price: number | null
  purchased_at: string
  project_id: string | null
  category: string | null
  notes: string | null
  created_at: string
  projects: { name: string } | null
}

type Project = { id: string; name: string }

type Props = {
  purchase: Purchase | null
  isNew: boolean
  defaultDate: string
  projects: Project[]
  onClose: () => void
  onSave: (p: Purchase) => void
  onDelete: (id: string) => void
}

const CATEGORY_SUGGESTIONS = [
  'Materials', 'Lumber', 'Hardware', 'Tools & Equipment',
  'Plants & Seeds', 'Landscaping', 'Labor', 'Appliances',
  'Permits & Fees', 'Rentals', 'Supplies', 'Other',
]

export function PurchasePanel({ purchase, isNew, defaultDate, projects, onClose, onSave, onDelete }: Props) {
  const [item,      setItem]      = useState('')
  const [vendor,    setVendor]    = useState('')
  const [price,     setPrice]     = useState('')
  const [date,      setDate]      = useState(defaultDate)
  const [category,  setCategory]  = useState('')
  const [projectId, setProjectId] = useState('')
  const [notes,     setNotes]     = useState('')
  const [saving,    setSaving]    = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const itemRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (purchase) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setItem(purchase.item_name)
      setVendor(purchase.vendor ?? '')
      setPrice(purchase.price != null ? String(purchase.price) : '')
      setDate(purchase.purchased_at)
      setCategory(purchase.category ?? '')
      setProjectId(purchase.project_id ?? '')
      setNotes(purchase.notes ?? '')
    } else {
      setItem(''); setVendor(''); setPrice(''); setDate(defaultDate)
      setCategory(''); setProjectId(''); setNotes('')
    }
    setConfirmDel(false)
    setTimeout(() => itemRef.current?.focus(), 50)
  }, [purchase, isNew, defaultDate])

  const open = !!purchase || isNew

  async function save() {
    if (!item.trim()) return
    setSaving(true)
    try {
      const body = {
        item_name:    item.trim(),
        vendor:       vendor.trim() || null,
        price:        price !== '' ? parseFloat(price) : null,
        purchased_at: date,
        category:     category.trim() || null,
        project_id:   projectId || null,
        notes:        notes.trim() || null,
      }
      if (isNew) {
        const res  = await fetch('/api/purchases', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        onSave(await res.json())
      } else if (purchase) {
        const res  = await fetch(`/api/purchases/${purchase.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        onSave(await res.json())
      }
    } finally { setSaving(false) }
  }

  async function del() {
    if (!purchase) return
    setSaving(true)
    try {
      await fetch(`/api/purchases/${purchase.id}`, { method: 'DELETE' })
      onDelete(purchase.id)
    } finally { setSaving(false) }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 transition-opacity duration-200"
        style={{ opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }}
        onClick={onClose} />

      <div className="fixed inset-y-0 right-0 z-50 w-[420px] bg-white shadow-2xl flex flex-col"
        style={{ transform: open ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1)' }}>

        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-zinc-100">
          <h2 className="font-display text-[22px] text-zinc-800">{isNew ? 'Log Purchase' : 'Edit Purchase'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* Item */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Item</label>
            <input ref={itemRef} value={item} onChange={e => setItem(e.target.value)}
              placeholder="e.g. Cedar fence posts"
              className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-200" />
          </div>

          {/* Vendor + Price */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Vendor</label>
              <input value={vendor} onChange={e => setVendor(e.target.value)}
                placeholder="e.g. Home Depot"
                className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-200" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Price ($)</label>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)}
                placeholder="0.00" min="0" step="0.01"
                className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-200" />
            </div>
          </div>

          {/* Date + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-200" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Category</label>
              <input list="category-suggestions" value={category} onChange={e => setCategory(e.target.value)}
                placeholder="Materials…"
                className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-200" />
              <datalist id="category-suggestions">
                {CATEGORY_SUGGESTIONS.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
          </div>

          {/* Project */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Project (optional)</label>
            <select value={projectId} onChange={e => setProjectId(e.target.value)}
              className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-200 bg-white">
              <option value="">No project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Quantity, specs, why you bought it…" rows={3}
              className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-200 resize-none" />
          </div>

        </div>

        <div className="px-6 py-4 border-t border-zinc-100 flex items-center justify-between gap-3">
          <div>
            {!isNew && !confirmDel && (
              <button onClick={() => setConfirmDel(true)} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-red-500 transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            )}
            {confirmDel && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">Delete this?</span>
                <button onClick={del} disabled={saving} className="text-xs text-red-600 font-medium hover:text-red-700 disabled:opacity-50">
                  {saving ? 'Deleting…' : 'Yes, delete'}
                </button>
                <button onClick={() => setConfirmDel(false)} className="text-xs text-zinc-400 hover:text-zinc-600">Cancel</button>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-zinc-600 border border-zinc-200 hover:bg-zinc-50 transition-colors">Cancel</button>
            <button onClick={save} disabled={saving || !item.trim()}
              className="px-4 py-2 rounded-lg text-sm text-white font-medium disabled:opacity-40 transition-colors"
              style={{ backgroundColor: SAGE }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
