'use client'

import { useEffect, useState } from 'react'

export type Asset = {
  id: string
  name: string
  asset_type: string
  description: string | null
  make: string | null
  model: string | null
  serial_number: string | null
  install_date: string | null
  last_serviced_at: string | null
  location: string | null
  notes: string | null
  created_at: string
}

const ASSET_TYPES = [
  { value: 'hvac',         label: 'HVAC / Heating & Cooling' },
  { value: 'water-heater', label: 'Water Heater' },
  { value: 'roof',         label: 'Roof' },
  { value: 'well-pump',    label: 'Well Pump' },
  { value: 'septic',       label: 'Septic System' },
  { value: 'electrical',   label: 'Electrical Panel' },
  { value: 'plumbing',     label: 'Plumbing' },
  { value: 'appliance',    label: 'Appliance' },
  { value: 'vehicle',      label: 'Vehicle / Equipment' },
  { value: 'structure',    label: 'Structure / Building' },
  { value: 'other',        label: 'Other' },
]

type Props = {
  asset: Asset | null   // null = new asset
  isOwner: boolean
  onClose: () => void
  onSaved: (a: Asset) => void
  onDeleted: (id: string) => void
}

export function AssetPanel({ asset, isOwner, onClose, onSaved, onDeleted }: Props) {
  const isNew = !asset

  const [name,        setName]        = useState(asset?.name            ?? '')
  const [assetType,   setAssetType]   = useState(asset?.asset_type      ?? 'hvac')
  const [description, setDescription] = useState(asset?.description     ?? '')
  const [make,        setMake]        = useState(asset?.make            ?? '')
  const [model,       setModel]       = useState(asset?.model           ?? '')
  const [serial,      setSerial]      = useState(asset?.serial_number   ?? '')
  const [installDate, setInstallDate] = useState(asset?.install_date    ?? '')
  const [serviced,    setServiced]    = useState(asset?.last_serviced_at ?? '')
  const [location,    setLocation]    = useState(asset?.location        ?? '')
  const [notes,       setNotes]       = useState(asset?.notes           ?? '')
  const [saving,      setSaving]      = useState(false)
  const [confirming,  setConfirming]  = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function save() {
    if (!name.trim()) { setError('Name is required.'); return }
    setSaving(true); setError(null)
    const body = {
      name: name.trim(), asset_type: assetType,
      description: description || undefined, make: make || undefined,
      model: model || undefined, serial_number: serial || undefined,
      install_date: installDate || undefined, last_serviced_at: serviced || undefined,
      location: location || undefined, notes: notes || undefined,
    }
    const url    = isNew ? '/api/assets' : `/api/assets/${asset!.id}`
    const method = isNew ? 'POST' : 'PATCH'
    const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data   = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed'); setSaving(false); return }
    onSaved(data as Asset)
    setSaving(false)
  }

  async function deleteAsset() {
    if (!asset) return
    setSaving(true)
    await fetch(`/api/assets/${asset.id}`, { method: 'DELETE' })
    onDeleted(asset.id)
  }

  const inp = 'w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:border-zinc-400 bg-white'
  const lbl = 'block text-xs text-zinc-500 mb-1 font-medium'

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-black/20 z-40" />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 shrink-0">
          <h2 className="font-semibold text-zinc-900">{isNew ? 'Add asset' : 'Edit asset'}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 text-xl">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className={lbl}>Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Main HVAC Unit" className={inp} autoFocus={isNew} disabled={!isOwner} />
          </div>
          <div>
            <label className={lbl}>Type *</label>
            <select value={assetType} onChange={e => setAssetType(e.target.value)} className={inp} disabled={!isOwner}>
              {ASSET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Location</label>
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Basement, Attic, Barn" className={inp} disabled={!isOwner} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Make</label>
              <input value={make} onChange={e => setMake(e.target.value)} placeholder="e.g. Carrier" className={inp} disabled={!isOwner} />
            </div>
            <div>
              <label className={lbl}>Model</label>
              <input value={model} onChange={e => setModel(e.target.value)} placeholder="e.g. 58CVA080" className={inp} disabled={!isOwner} />
            </div>
          </div>
          <div>
            <label className={lbl}>Serial Number</label>
            <input value={serial} onChange={e => setSerial(e.target.value)} className={inp} disabled={!isOwner} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Install Date</label>
              <input type="date" value={installDate} onChange={e => setInstallDate(e.target.value)} className={inp} disabled={!isOwner} />
            </div>
            <div>
              <label className={lbl}>Last Serviced</label>
              <input type="date" value={serviced} onChange={e => setServiced(e.target.value)} className={inp} disabled={!isOwner} />
            </div>
          </div>
          <div>
            <label className={lbl}>Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)} className={inp} disabled={!isOwner} />
          </div>
          <div>
            <label className={lbl}>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              className={`${inp} resize-none`} disabled={!isOwner} />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        {/* Footer */}
        {isOwner && (
          <div className="px-6 py-4 border-t border-zinc-100 flex items-center gap-3 shrink-0">
            <button onClick={save} disabled={saving}
              className="px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg disabled:opacity-40 hover:bg-zinc-700 transition-colors">
              {saving ? 'Saving…' : isNew ? 'Add asset' : 'Save changes'}
            </button>
            <button onClick={onClose} className="text-sm text-zinc-500 hover:text-zinc-800">Cancel</button>
            {!isNew && !confirming && (
              <button onClick={() => setConfirming(true)}
                className="ml-auto text-xs text-zinc-300 hover:text-red-500 transition-colors">
                Delete
              </button>
            )}
            {confirming && (
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-zinc-500">Are you sure?</span>
                <button onClick={deleteAsset} className="text-xs text-red-500 font-medium">Yes, delete</button>
                <button onClick={() => setConfirming(false)} className="text-xs text-zinc-400">Cancel</button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
