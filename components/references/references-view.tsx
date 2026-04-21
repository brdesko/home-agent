'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { ReferencePanel } from './reference-panel'

const SAGE = 'oklch(0.50 0.10 155)'

type SavedReference = {
  id: string
  type: 'vendor' | 'brand' | 'resource'
  name: string
  notes: string | null
  url: string | null
  created_at: string
}

const TYPE_LABELS: Record<string, string> = {
  vendor:   'Trusted Vendors',
  brand:    'Preferred Brands',
  resource: 'Resources',
}

const TYPE_ORDER = ['vendor', 'brand', 'resource']

type Props = {
  initialRefs: SavedReference[]
}

export function ReferencesView({ initialRefs }: Props) {
  const [refs, setRefs]         = useState<SavedReference[]>(initialRefs)
  const [selected, setSelected] = useState<SavedReference | null>(null)
  const [isNew, setIsNew]       = useState(false)

  function openNew() {
    setSelected(null)
    setIsNew(true)
  }

  function openRef(ref: SavedReference) {
    setIsNew(false)
    setSelected(ref)
  }

  function closePanel() {
    setSelected(null)
    setIsNew(false)
  }

  function handleSave(updated: SavedReference) {
    setRefs(prev => {
      const exists = prev.find(r => r.id === updated.id)
      if (exists) return prev.map(r => r.id === updated.id ? updated : r)
      return [updated, ...prev]
    })
    closePanel()
  }

  function handleDelete(id: string) {
    setRefs(prev => prev.filter(r => r.id !== id))
    closePanel()
  }

  const grouped: Record<string, SavedReference[]> = {}
  for (const type of TYPE_ORDER) {
    const inType = refs.filter(r => r.type === type)
    if (inType.length > 0) grouped[type] = inType
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 pt-7 pb-3 border-b border-zinc-100 flex items-center justify-between">
          <h1 className="text-[28px] font-display text-zinc-800 leading-tight">References</h1>
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: SAGE }}>
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>

        <div className="max-w-2xl mx-auto px-6 py-10 space-y-10">
          {Object.keys(grouped).length === 0 ? (
            <div className="text-center py-20">
              <p className="text-zinc-400 text-sm">No references saved yet.</p>
              <p className="text-zinc-300 text-xs mt-1">
                Ask the Agent to save a vendor, brand, or resource, or add one manually.
              </p>
            </div>
          ) : (
            Object.entries(grouped).map(([type, items]) => (
              <section key={type}>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-600 mb-4">
                  {TYPE_LABELS[type] ?? type}
                </h2>
                <div className="space-y-3">
                  {items.map(ref => (
                    <button
                      key={ref.id}
                      onClick={() => openRef(ref)}
                      className="w-full text-left border border-zinc-200 rounded-lg p-4 space-y-1.5 hover:border-zinc-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-medium text-zinc-900 leading-snug">{ref.name}</p>
                        {ref.url && (
                          <span className="text-xs text-zinc-400 shrink-0">Link ↗</span>
                        )}
                      </div>
                      {ref.notes && (
                        <p className="text-sm text-zinc-500 leading-relaxed line-clamp-2">{ref.notes}</p>
                      )}
                      <p className="text-xs text-zinc-300">
                        {new Date(ref.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                    </button>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>

      <ReferencePanel
        reference={selected}
        isNew={isNew}
        onClose={closePanel}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </>
  )
}
