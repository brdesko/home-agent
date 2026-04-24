'use client'

import { useState } from 'react'

export type Room = {
  id: string
  zone_id: string
  name: string
  status: 'not_started' | 'in_progress' | 'complete'
  notes: string | null
  sort_order: number
  pos_x: number | null
  pos_y: number | null
  pos_w: number | null
  pos_h: number | null
}

const STATUS_META = {
  not_started: { bg: '#1e293b', border: '#334155', text: '#94a3b8', dot: '#475569', label: 'Not started' },
  in_progress: { bg: '#431407', border: '#7c2d12', text: '#fb923c', dot: '#f97316', label: 'In progress' },
  complete:    { bg: '#052e16', border: '#14532d', text: '#4ade80', dot: '#22c55e', label: 'Complete'    },
}

const STATUS_ORDER: Room['status'][] = ['not_started', 'in_progress', 'complete']

function RoomTile({ room, isOwner, onStatusChange, onDelete }: {
  room: Room
  isOwner: boolean
  onStatusChange: (id: string, status: Room['status']) => void
  onDelete: (id: string) => void
}) {
  const m = STATUS_META[room.status]
  const next = STATUS_ORDER[(STATUS_ORDER.indexOf(room.status) + 1) % 3]

  return (
    <div
      className="rounded-lg border p-3 space-y-1.5 transition-colors"
      style={{ backgroundColor: m.bg, borderColor: m.border }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-white leading-snug">{room.name}</span>
        {isOwner && (
          <button
            onClick={() => onDelete(room.id)}
            className="text-zinc-600 hover:text-red-400 transition-colors text-xs shrink-0 mt-0.5"
            title="Remove room"
          >✕</button>
        )}
      </div>

      {isOwner ? (
        <button
          onClick={() => onStatusChange(room.id, next)}
          title="Click to advance status"
          className="inline-flex items-center gap-1.5 text-xs rounded-full border px-2 py-0.5 transition-colors hover:opacity-80"
          style={{ color: m.text, borderColor: m.border }}
        >
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: m.dot }} />
          {m.label}
        </button>
      ) : (
        <div className="inline-flex items-center gap-1.5 text-xs" style={{ color: m.text }}>
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: m.dot }} />
          {m.label}
        </div>
      )}

      {room.notes && (
        <p className="text-xs leading-relaxed" style={{ color: m.text, opacity: 0.75 }}>{room.notes}</p>
      )}
    </div>
  )
}

export function ZoneInterior({
  zoneId,
  zoneName,
  zoneColor,
  rooms,
  isOwner,
  onRoomsChange,
}: {
  zoneId: string
  zoneName: string
  zoneColor: string
  rooms: Room[]
  isOwner: boolean
  onRoomsChange: (rooms: Room[]) => void
}) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleAdd() {
    if (!newName.trim()) return
    setSaving(true); setErr(null)
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zone_id: zoneId, name: newName.trim() }),
      })
      if (res.ok) {
        const room = await res.json() as Room
        onRoomsChange([...rooms, room])
        setNewName('')
        setAdding(false)
      } else {
        const d = await res.json()
        setErr(d.error ?? 'Failed to add room')
      }
    } catch { setErr('Network error') } finally { setSaving(false) }
  }

  async function handleStatusChange(id: string, status: Room['status']) {
    const res = await fetch(`/api/rooms/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) onRoomsChange(rooms.map(r => r.id === id ? { ...r, status } : r))
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/rooms/${id}`, { method: 'DELETE' })
    if (res.ok) onRoomsChange(rooms.filter(r => r.id !== id))
  }

  const statusCounts = {
    not_started: rooms.filter(r => r.status === 'not_started').length,
    in_progress: rooms.filter(r => r.status === 'in_progress').length,
    complete:    rooms.filter(r => r.status === 'complete').length,
  }

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto">
      {/* Zone header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: zoneColor }} />
          <h2 className="text-sm font-semibold text-zinc-200">{zoneName}</h2>
        </div>

        {rooms.length > 0 && (
          <div className="flex gap-2 text-xs">
            {statusCounts.complete > 0 && (
              <span className="text-emerald-500">{statusCounts.complete} done</span>
            )}
            {statusCounts.in_progress > 0 && (
              <span className="text-orange-400">{statusCounts.in_progress} in progress</span>
            )}
            {statusCounts.not_started > 0 && (
              <span className="text-zinc-500">{statusCounts.not_started} not started</span>
            )}
          </div>
        )}
      </div>

      {/* Rooms */}
      {rooms.length === 0 && !adding ? (
        <p className="text-xs text-zinc-600 leading-relaxed">
          {isOwner ? 'No rooms yet. Add rooms to track interior progress.' : 'No rooms defined for this zone.'}
        </p>
      ) : (
        <div className="space-y-2">
          {rooms.map(room => (
            <RoomTile
              key={room.id}
              room={room}
              isOwner={isOwner}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Add room form */}
      {isOwner && (
        adding ? (
          <div className="space-y-2">
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAdd()
                if (e.key === 'Escape') { setAdding(false); setNewName('') }
              }}
              placeholder="Room name"
              className="w-full text-xs bg-zinc-800/80 border border-zinc-700 rounded-md px-2.5 py-1.5 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
            />
            {err && <p className="text-xs text-red-400">{err}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={saving || !newName.trim()}
                className="text-xs px-3 py-1.5 bg-zinc-700 text-zinc-200 rounded-md disabled:opacity-40 hover:bg-zinc-600 transition-colors"
              >
                {saving ? '…' : 'Add'}
              </button>
              <button
                onClick={() => { setAdding(false); setNewName(''); setErr(null) }}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors text-left"
          >
            + Add room
          </button>
        )
      )}
    </div>
  )
}
