'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Trash2, ExternalLink } from 'lucide-react'

const SAGE = 'oklch(0.50 0.10 155)'

type SavedReference = {
  id: string
  type: 'vendor' | 'brand' | 'resource'
  name: string
  notes: string | null
  url: string | null
  created_at: string
}

type Props = {
  reference: SavedReference | null
  isNew?: boolean
  onClose: () => void
  onSave: (ref: SavedReference) => void
  onDelete: (id: string) => void
}

const TYPE_LABELS: Record<string, string> = {
  vendor:   'Vendor',
  brand:    'Brand',
  resource: 'Resource',
}

export function ReferencePanel({ reference, isNew, onClose, onSave, onDelete }: Props) {
  const [name,  setName]  = useState(reference?.name  ?? '')
  const [type,  setType]  = useState<'vendor' | 'brand' | 'resource'>(reference?.type  ?? 'vendor')
  const [url,   setUrl]   = useState(reference?.url   ?? '')
  const [notes, setNotes] = useState(reference?.notes ?? '')
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(reference?.name  ?? '')
    setType(reference?.type  ?? 'vendor')
    setUrl(reference?.url    ?? '')
    setNotes(reference?.notes ?? '')
    setConfirmDelete(false)
    setTimeout(() => nameRef.current?.focus(), 50)
  }, [reference])

  async function save() {
    if (!name.trim()) return
    setSaving(true)
    try {
      if (isNew) {
        const res  = await fetch('/api/references', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, name: name.trim(), notes: notes.trim() || null, url: url.trim() || null }),
        })
        const data = await res.json()
        onSave(data)
      } else if (reference) {
        const res  = await fetch(`/api/references/${reference.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, name: name.trim(), notes: notes.trim() || null, url: url.trim() || null }),
        })
        const data = await res.json()
        onSave(data)
      }
    } finally {
      setSaving(false)
    }
  }

  async function del() {
    if (!reference) return
    setDeleting(true)
    try {
      await fetch(`/api/references/${reference.id}`, { method: 'DELETE' })
      onDelete(reference.id)
    } finally {
      setDeleting(false)
    }
  }

  const open = !!reference || !!isNew

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 transition-opacity duration-200"
        style={{ opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed inset-y-0 right-0 z-50 w-[420px] bg-white shadow-2xl flex flex-col"
        style={{
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-zinc-100">
          <h2 className="font-display text-[22px] text-zinc-800 leading-tight">
            {isNew ? 'New Reference' : 'Edit Reference'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Name</label>
            <input
              ref={nameRef}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Green Barn Lumber"
              className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-200"
            />
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Type</label>
            <div className="flex gap-2">
              {(['vendor', 'brand', 'resource'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className="flex-1 py-2 rounded-lg text-sm font-medium border transition-colors"
                  style={type === t
                    ? { backgroundColor: SAGE, borderColor: SAGE, color: 'white' }
                    : { backgroundColor: 'white', borderColor: '#e4e4e7', color: '#71717a' }}
                >
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">URL</label>
            <div className="relative">
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://…"
                className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-200 pr-9"
              />
              {url && (
                <a href={url} target="_blank" rel="noopener noreferrer"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any notes about this reference…"
              rows={4}
              className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-200 resize-none"
            />
          </div>

          {/* Created date (existing only) */}
          {reference && !isNew && (
            <p className="text-xs text-zinc-300">
              Added {new Date(reference.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-100 flex items-center justify-between gap-3">
          <div>
            {!isNew && !confirmDelete && (
              <button onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-red-500 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            )}
            {confirmDelete && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">Delete this?</span>
                <button onClick={del} disabled={deleting}
                  className="text-xs text-red-600 font-medium hover:text-red-700 disabled:opacity-50">
                  {deleting ? 'Deleting…' : 'Yes, delete'}
                </button>
                <button onClick={() => setConfirmDelete(false)} className="text-xs text-zinc-400 hover:text-zinc-600">
                  Cancel
                </button>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-zinc-600 border border-zinc-200 hover:bg-zinc-50 transition-colors">
              Cancel
            </button>
            <button onClick={save} disabled={saving || !name.trim()}
              className="px-4 py-2 rounded-lg text-sm text-white font-medium transition-colors disabled:opacity-40"
              style={{ backgroundColor: SAGE }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
