'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import type { SiteConfig, Zone } from './site-plan'
import type { Room } from './zone-interior'

const SitePlan      = dynamic(() => import('./site-plan').then(m => ({ default: m.SitePlan })),      { ssr: false })
const ZoneInterior  = dynamic(() => import('./zone-interior').then(m => ({ default: m.ZoneInterior })), { ssr: false })

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="h-full flex items-center justify-center" style={{ background: '#0e1520' }}>
      <div className="text-center max-w-sm px-6 space-y-5">
        <div className="w-12 h-12 rounded-xl mx-auto flex items-center justify-center bg-zinc-800/80 border border-zinc-700">
          <svg className="w-6 h-6 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
          </svg>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold text-zinc-300">No site plan yet</p>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Upload an aerial or overhead photo of your property in the Photos tab, then ask the Agent to derive your site plan from it.
          </p>
        </div>
        <div className="text-left bg-zinc-800/60 border border-zinc-700/60 rounded-lg p-4 space-y-2">
          <p className="text-xs font-medium text-zinc-400">Getting started</p>
          <ol className="space-y-1.5 text-xs text-zinc-500 list-decimal list-inside">
            <li>Upload an aerial or satellite photo in Photos</li>
            <li>Go to the Agent and say: <span className="text-zinc-400 italic">&ldquo;Derive my property site plan from my aerial photo&rdquo;</span></li>
            <li>Review the result and refine via conversation</li>
          </ol>
        </div>
        <p className="text-xs text-zinc-600">
          Best results with overhead / satellite images. Ground-level photos work for interior room layouts.
        </p>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PropertyVisual({ isOwner }: { isOwner: boolean }) {
  const [config,       setConfig]       = useState<SiteConfig | null>(null)
  const [rooms,        setRooms]        = useState<Room[]>([])
  const [loading,      setLoading]      = useState(true)
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/visual-config').then(r => r.json()),
      fetch('/api/rooms').then(r => r.json()),
    ]).then(([cfg, roomData]) => {
      if (cfg?.site_config) setConfig(cfg.site_config as SiteConfig)
      setRooms(Array.isArray(roomData) ? roomData : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const activeZone   = config?.zones.find(z => z.id === activeZoneId) ?? null
  const activeRooms  = activeZoneId ? rooms.filter(r => r.zone_id === activeZoneId) : []

  function handleZoneClick(id: string) {
    setActiveZoneId(prev => prev === id ? null : id)
  }

  if (loading) {
    return (
      <div className="flex gap-4" style={{ height: '72vh' }}>
        <div className="flex-1 rounded-xl animate-pulse bg-zinc-900/60" style={{ border: '1px solid #1e293b' }} />
        <div className="w-56 space-y-2">
          {[...Array(6)].map((_, i) => <div key={i} className="h-9 rounded-lg bg-zinc-900/60 animate-pulse" />)}
        </div>
      </div>
    )
  }

  const hasConfig = config && config.zones && config.zones.length > 0

  return (
    <div className="flex gap-4" style={{ height: '72vh' }}>

      {/* ── Canvas ── */}
      <div className="flex-1 rounded-xl overflow-hidden" style={{ border: '1px solid #1e293b', background: '#0e1520' }}>
        {!hasConfig ? (
          <EmptyState />
        ) : activeZoneId && activeZone ? (
          <ZoneInteriorCanvas
            zone={activeZone}
            rooms={activeRooms}
            isOwner={isOwner}
            onBack={() => setActiveZoneId(null)}
            onRoomsChange={(updated) => {
              setRooms(prev => [
                ...prev.filter(r => r.zone_id !== activeZoneId),
                ...updated,
              ])
            }}
          />
        ) : (
          <SitePlan
            config={config}
            activeZoneId={activeZoneId}
            onZoneClick={handleZoneClick}
          />
        )}
      </div>

      {/* ── Side panel ── */}
      <div className="w-56 flex flex-col gap-1.5 shrink-0">
        {!hasConfig ? (
          <p className="text-xs text-zinc-600 leading-relaxed pt-2">
            Set up a site plan to navigate zones and track interior progress.
          </p>
        ) : activeZoneId && activeZone ? (
          <>
            <button
              onClick={() => setActiveZoneId(null)}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-2"
            >
              ← All zones
            </button>
            <ZoneInterior
              zoneId={activeZoneId}
              zoneName={activeZone.name}
              zoneColor={activeZone.color}
              rooms={activeRooms}
              isOwner={isOwner}
              onRoomsChange={(updated) => {
                setRooms(prev => [
                  ...prev.filter(r => r.zone_id !== activeZoneId),
                  ...updated,
                ])
              }}
            />
          </>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">
              Property Zones
            </p>
            {config.zones.map(z => {
              const zoneRooms    = rooms.filter(r => r.zone_id === z.id)
              const doneCount    = zoneRooms.filter(r => r.status === 'complete').length
              const activeCount  = zoneRooms.filter(r => r.status === 'in_progress').length

              return (
                <button
                  key={z.id}
                  onClick={() => handleZoneClick(z.id)}
                  className={`text-left px-3 py-2.5 rounded-lg border transition-all ${
                    activeZoneId === z.id
                      ? 'border-zinc-600 bg-zinc-800/80'
                      : 'border-zinc-800/60 hover:border-zinc-700 hover:bg-zinc-900/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: z.color }} />
                    <span className="flex-1 text-xs font-medium text-zinc-300 leading-tight">{z.name}</span>
                    {activeCount > 0 && (
                      <span className="text-xs text-orange-400 shrink-0">{activeCount}</span>
                    )}
                    {activeCount === 0 && doneCount > 0 && doneCount === zoneRooms.length && zoneRooms.length > 0 && (
                      <span className="text-xs text-emerald-500 shrink-0">✓</span>
                    )}
                  </div>
                  {z.description && (
                    <p className="text-xs text-zinc-600 mt-1 leading-snug line-clamp-2">{z.description}</p>
                  )}
                </button>
              )
            })}

            <div className="mt-auto pt-4 border-t border-zinc-800/50">
              <p className="text-xs text-zinc-600 leading-relaxed">
                Scroll to zoom · drag to pan · click a zone to explore
              </p>
            </div>
          </>
        )}
      </div>

    </div>
  )
}

// ─── Zone interior canvas wrapper ─────────────────────────────────────────────

function ZoneInteriorCanvas({ zone, rooms, isOwner, onBack, onRoomsChange }: {
  zone: Zone
  rooms: Room[]
  isOwner: boolean
  onBack: () => void
  onRoomsChange: (rooms: Room[]) => void
}) {
  return (
    <div className="h-full flex flex-col" style={{ background: '#0e1520' }}>
      {/* Header bar */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-zinc-800/60">
        <button onClick={onBack} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          ← Site plan
        </button>
        <div className="w-px h-4 bg-zinc-800" />
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: zone.color }} />
          <span className="text-xs font-semibold text-zinc-300">{zone.name}</span>
        </div>
        {zone.description && (
          <>
            <div className="w-px h-4 bg-zinc-800" />
            <span className="text-xs text-zinc-600 truncate">{zone.description}</span>
          </>
        )}
      </div>

      {/* Room tiles */}
      <div className="flex-1 overflow-y-auto p-5">
        {rooms.length === 0 && !isOwner ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-zinc-600">No rooms defined for this zone.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {rooms.map(room => {
              const m = {
                not_started: { bg: '#1e293b', border: '#334155', text: '#94a3b8', dot: '#475569', label: 'Not started' },
                in_progress: { bg: '#431407', border: '#7c2d12', text: '#fb923c', dot: '#f97316', label: 'In progress' },
                complete:    { bg: '#052e16', border: '#14532d', text: '#4ade80', dot: '#22c55e', label: 'Complete'    },
              }[room.status]
              const statuses: Room['status'][] = ['not_started', 'in_progress', 'complete']
              const next = statuses[(statuses.indexOf(room.status) + 1) % 3]

              return (
                <div
                  key={room.id}
                  className="rounded-xl border p-4 flex flex-col gap-2 transition-colors"
                  style={{ backgroundColor: m.bg, borderColor: m.border }}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-sm font-medium text-white leading-snug">{room.name}</span>
                    {isOwner && (
                      <button
                        onClick={async () => {
                          const res = await fetch(`/api/rooms/${room.id}`, { method: 'DELETE' })
                          if (res.ok) onRoomsChange(rooms.filter(r => r.id !== room.id))
                        }}
                        className="text-zinc-700 hover:text-red-400 transition-colors text-xs shrink-0"
                      >✕</button>
                    )}
                  </div>
                  {isOwner ? (
                    <button
                      onClick={async () => {
                        const res = await fetch(`/api/rooms/${room.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ status: next }),
                        })
                        if (res.ok) onRoomsChange(rooms.map(r => r.id === room.id ? { ...r, status: next } : r))
                      }}
                      title="Click to advance status"
                      className="self-start inline-flex items-center gap-1.5 text-xs rounded-full border px-2.5 py-0.5 transition-colors hover:opacity-80"
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
                  {room.notes && <p className="text-xs leading-relaxed" style={{ color: m.text, opacity: 0.7 }}>{room.notes}</p>}
                </div>
              )
            })}

            {/* Add room tile */}
            {isOwner && <AddRoomTile zoneId={zone.id} onAdded={r => onRoomsChange([...rooms, r])} />}
          </div>
        )}
      </div>
    </div>
  )
}

function AddRoomTile({ zoneId, onAdded }: { zoneId: string; onAdded: (r: Room) => void }) {
  const [editing, setEditing] = useState(false)
  const [name,    setName]    = useState('')
  const [saving,  setSaving]  = useState(false)

  async function save() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zone_id: zoneId, name: name.trim() }),
      })
      if (res.ok) { onAdded(await res.json() as Room); setName(''); setEditing(false) }
    } finally { setSaving(false) }
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="rounded-xl border border-dashed border-zinc-700 p-4 flex items-center justify-center text-xs text-zinc-600 hover:border-zinc-500 hover:text-zinc-400 transition-colors"
      >
        + Add room
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-800/60 p-4 space-y-2">
      <input
        autoFocus
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setEditing(false); setName('') } }}
        placeholder="Room name"
        className="w-full text-xs bg-zinc-900/60 border border-zinc-700 rounded-md px-2.5 py-1.5 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
      />
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving || !name.trim()}
          className="text-xs px-2.5 py-1 bg-zinc-700 text-zinc-200 rounded-md disabled:opacity-40 hover:bg-zinc-600 transition-colors"
        >
          {saving ? '…' : 'Add'}
        </button>
        <button onClick={() => { setEditing(false); setName('') }} className="text-xs text-zinc-500 hover:text-zinc-300">
          Cancel
        </button>
      </div>
    </div>
  )
}
