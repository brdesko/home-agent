'use client'

import { useState } from 'react'
import { AssetPanel, type Asset } from './asset-panel'

const TYPE_LABELS: Record<string, string> = {
  'hvac':         'HVAC / Heating & Cooling',
  'water-heater': 'Water Heater',
  'roof':         'Roof',
  'well-pump':    'Well Pump',
  'septic':       'Septic System',
  'electrical':   'Electrical Panel',
  'plumbing':     'Plumbing',
  'appliance':    'Appliance',
  'vehicle':      'Vehicle / Equipment',
  'structure':    'Structure / Building',
  'other':        'Other',
}

const TYPE_ORDER = ['hvac', 'water-heater', 'roof', 'well-pump', 'septic', 'electrical', 'plumbing', 'appliance', 'vehicle', 'structure', 'other']

type Props = {
  initial: Asset[]
  isOwner: boolean
}

export function AssetsTab({ initial, isOwner }: Props) {
  const [assets,   setAssets]   = useState<Asset[]>(initial)
  const [selected, setSelected] = useState<Asset | null | 'new'>(null)

  function handleSaved(a: Asset) {
    setAssets(prev => {
      const idx = prev.findIndex(x => x.id === a.id)
      return idx >= 0 ? prev.map(x => x.id === a.id ? a : x) : [...prev, a]
    })
    setSelected(null)
  }

  function handleDeleted(id: string) {
    setAssets(prev => prev.filter(a => a.id !== id))
    setSelected(null)
  }

  // Group by type
  const grouped: Record<string, Asset[]> = {}
  for (const t of TYPE_ORDER) {
    const inType = assets.filter(a => a.asset_type === t)
    if (inType.length) grouped[t] = inType
  }
  for (const a of assets) {
    if (!TYPE_ORDER.includes(a.asset_type)) {
      grouped[a.asset_type] ??= []
      grouped[a.asset_type].push(a)
    }
  }

  return (
    <>
      <div className="space-y-6">
        {isOwner && (
          <button onClick={() => setSelected('new')}
            className="text-sm px-4 py-2 border border-zinc-300 rounded-lg hover:border-zinc-500 transition-colors">
            + Add asset
          </button>
        )}

        {assets.length === 0 && (
          <p className="text-sm text-zinc-400 py-8 text-center">No assets recorded. Add HVAC, well pump, appliances, vehicles, and other systems here.</p>
        )}

        {Object.entries(grouped).map(([type, typeAssets]) => (
          <section key={type}>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-600 mb-3">
              {TYPE_LABELS[type] ?? type}
            </h2>
            <div className="space-y-2">
              {typeAssets.map(a => (
                <button key={a.id} onClick={() => setSelected(a)}
                  className="w-full text-left border border-zinc-100 rounded-lg px-4 py-3 hover:border-zinc-300 hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-zinc-800">{a.name}</p>
                      {(a.make || a.model) && (
                        <p className="text-xs text-zinc-400 mt-0.5">{[a.make, a.model].filter(Boolean).join(' ')}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {a.last_serviced_at && (
                        <p className="text-xs text-zinc-400">Serviced {new Date(a.last_serviced_at + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
                      )}
                      {a.install_date && (
                        <p className="text-xs text-zinc-300">Installed {new Date(a.install_date + 'T00:00:00').getFullYear()}</p>
                      )}
                    </div>
                  </div>
                  {a.location && <p className="text-xs text-zinc-400 mt-1">{a.location}</p>}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      {selected !== null && (
        <AssetPanel
          asset={selected === 'new' ? null : selected}
          isOwner={isOwner}
          onClose={() => setSelected(null)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </>
  )
}
