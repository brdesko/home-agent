'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { ZONES, type ZoneId } from './scene'

const PropertyScene = dynamic(() => import('./scene'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center" style={{ background: '#0d1117' }}>
      <p className="text-sm text-zinc-500">Loading 3D view…</p>
    </div>
  ),
})

const ZONE_DESCRIPTIONS: Record<ZoneId, string> = {
  house:    'Main residence, gardens, and brick patio.',
  pool:     'Kidney-shaped pool, deck, and entertaining area.',
  barn:     'Red barn and large white outbuilding (greenhouse / stable).',
  pasture:  'Open fields to the south and west of the barn.',
  woodland: 'Tree line and creek corridor along the south border.',
  drive:    'Curved gravel driveway, parking, and entry from Durham Rd.',
}

export function PropertyVisual() {
  const [activeZone, setActiveZone] = useState<ZoneId | null>(null)

  function toggleZone(id: ZoneId) {
    setActiveZone(prev => prev === id ? null : id)
  }

  const active = ZONES.find(z => z.id === activeZone)

  return (
    <div className="flex gap-4" style={{ height: '72vh' }}>

      {/* ── 3D canvas ── */}
      <div className="flex-1 rounded-xl overflow-hidden" style={{ border: '1px solid #1e293b' }}>
        <PropertyScene activeZone={activeZone} onZoneClick={toggleZone} />
      </div>

      {/* ── Zone panel ── */}
      <div className="w-56 flex flex-col gap-1.5 shrink-0">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">
          Property Zones
        </p>

        {ZONES.map(z => (
          <button
            key={z.id}
            onClick={() => toggleZone(z.id)}
            className={`text-left px-3 py-2.5 rounded-lg border transition-all ${
              activeZone === z.id
                ? 'border-zinc-600 bg-zinc-800/80'
                : 'border-zinc-800/60 hover:border-zinc-700 hover:bg-zinc-900/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: z.color }} />
              <span className="text-xs font-medium text-zinc-300 leading-tight">{z.name}</span>
            </div>
          </button>
        ))}

        {/* Zone detail */}
        {active && (
          <div className="mt-3 pt-3 border-t border-zinc-800">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: active.color }} />
              <p className="text-xs font-semibold text-zinc-200">{active.name}</p>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">
              {ZONE_DESCRIPTIONS[active.id]}
            </p>
          </div>
        )}

        <div className="mt-auto pt-4 border-t border-zinc-800/50">
          <p className="text-xs text-zinc-600 leading-relaxed">
            Drag to orbit · scroll to zoom · click a zone to select
          </p>
        </div>
      </div>

    </div>
  )
}
