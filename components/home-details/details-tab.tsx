'use client'

import { useState } from 'react'
import { ParseConfirmation, type ParseResult } from './parse-confirmation'

type PropertyDetails = {
  id: string
  name: string
  address: string | null
  acreage: number | null
  year_built: number | null
  sq_footage: number | null
  lot_size: string | null
  heat_type: string | null
  well_septic: string | null
  details_notes: string | null
}

type Props = {
  property: PropertyDetails
  isOwner: boolean
}

const HEAT_TYPES = ['oil', 'gas', 'propane', 'electric', 'heat pump', 'wood/pellet', 'other']

export function DetailsTab({ property: initial, isOwner }: Props) {
  const [prop,       setProp]       = useState(initial)
  const [parseMode,   setParseMode]   = useState<'url' | 'text'>('url')
  const [parseUrl,    setParseUrl]    = useState('')
  const [pasteText,   setPasteText]   = useState('')
  const [parsing,     setParsing]     = useState(false)
  const [parseErr,    setParseErr]    = useState<string | null>(null)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)

  async function saveField(field: string, value: unknown) {
    if (!isOwner) return
    const res = await fetch('/api/property', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value === '' ? null : value }),
    })
    if (res.ok) {
      const updated = await res.json()
      setProp(updated)
    }
  }

  async function runParse() {
    setParsing(true); setParseErr(null)
    try {
      const body = parseMode === 'url'
        ? { source: 'url',  url:  parseUrl.trim() }
        : { source: 'text', text: pasteText.trim() }
      const res = await fetch('/api/agent/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setParseErr(data.error ?? 'Failed'); return }
      setParseResult(data as ParseResult)
    } catch (e) { setParseErr(String(e)) } finally { setParsing(false) }
  }

  const inp  = 'w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:border-zinc-400 bg-white disabled:bg-zinc-50 disabled:text-zinc-400'
  const lbl  = 'block text-xs text-zinc-500 mb-1 font-medium'

  return (
    <>
      <div className="space-y-8 max-w-2xl">
        {/* Basic info */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-600">Property</h2>
          <div>
            <label className={lbl}>Name</label>
            <input defaultValue={prop.name} disabled={!isOwner}
              onBlur={e => { if (e.target.value !== prop.name) saveField('name', e.target.value) }}
              className={inp} />
          </div>
          <div>
            <label className={lbl}>Address</label>
            <input defaultValue={prop.address ?? ''} disabled={!isOwner}
              onBlur={e => saveField('address', e.target.value)}
              className={inp} />
          </div>
        </section>

        {/* Physical details */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-600">Physical Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Year Built</label>
              <input type="number" defaultValue={prop.year_built ?? ''} disabled={!isOwner}
                onBlur={e => saveField('year_built', e.target.value ? parseInt(e.target.value) : null)}
                className={inp} />
            </div>
            <div>
              <label className={lbl}>Square Footage</label>
              <input type="number" defaultValue={prop.sq_footage ?? ''} disabled={!isOwner}
                onBlur={e => saveField('sq_footage', e.target.value ? parseInt(e.target.value) : null)}
                className={inp} />
            </div>
            <div>
              <label className={lbl}>Acreage</label>
              <input type="number" step="0.01" defaultValue={prop.acreage ?? ''} disabled={!isOwner}
                onBlur={e => saveField('acreage', e.target.value ? parseFloat(e.target.value) : null)}
                className={inp} />
            </div>
            <div>
              <label className={lbl}>Lot Size</label>
              <input defaultValue={prop.lot_size ?? ''} disabled={!isOwner} placeholder="e.g. 5.3 acres"
                onBlur={e => saveField('lot_size', e.target.value)}
                className={inp} />
            </div>
          </div>
          <div>
            <label className={lbl}>Heating Type</label>
            <select defaultValue={prop.heat_type ?? ''} disabled={!isOwner}
              onChange={e => saveField('heat_type', e.target.value)}
              className={inp}>
              <option value="">— unknown —</option>
              {HEAT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Well &amp; Septic</label>
            <textarea defaultValue={prop.well_septic ?? ''} disabled={!isOwner} rows={2}
              onBlur={e => saveField('well_septic', e.target.value)}
              placeholder="e.g. Private well, 4-bedroom septic installed 2008"
              className={`${inp} resize-none`} />
          </div>
        </section>

        {/* Notes */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-600">Notes</h2>
          <textarea defaultValue={prop.details_notes ?? ''} disabled={!isOwner} rows={4}
            onBlur={e => saveField('details_notes', e.target.value)}
            placeholder="Anything notable about the property not captured above…"
            className={`${inp} resize-none`} />
        </section>

        {/* Parse from URL or pasted text */}
        {isOwner && (
          <section className="space-y-3 border-t border-zinc-100 pt-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-600">Parse with Agent</h2>
              <div className="flex gap-1 text-xs">
                <button onClick={() => setParseMode('url')}
                  className={`px-2.5 py-1 rounded-full transition-colors ${parseMode === 'url' ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:text-zinc-600'}`}>
                  URL
                </button>
                <button onClick={() => setParseMode('text')}
                  className={`px-2.5 py-1 rounded-full transition-colors ${parseMode === 'text' ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:text-zinc-600'}`}>
                  Paste text
                </button>
              </div>
            </div>

            {parseMode === 'url' ? (
              <div className="space-y-1.5">
                <p className="text-xs text-zinc-400">Zillow and Redfin block automated access — use "Paste text" instead for those.</p>
                <div className="flex gap-2">
                  <input value={parseUrl} onChange={e => setParseUrl(e.target.value)}
                    placeholder="https://…"
                    className="flex-1 text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:border-zinc-400" />
                  <button onClick={runParse} disabled={parsing || !parseUrl.trim()}
                    className="px-4 py-2 text-sm font-medium bg-zinc-900 text-white rounded-lg disabled:opacity-40 hover:bg-zinc-700 transition-colors shrink-0">
                    {parsing ? 'Parsing…' : 'Parse'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <p className="text-xs text-zinc-400">On the Zillow or Redfin listing, press Ctrl+A then Ctrl+C, then paste below.</p>
                <textarea value={pasteText} onChange={e => setPasteText(e.target.value)}
                  rows={5} placeholder="Paste listing text here…"
                  className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:border-zinc-400 resize-none" />
                <button onClick={runParse} disabled={parsing || !pasteText.trim()}
                  className="px-4 py-2 text-sm font-medium bg-zinc-900 text-white rounded-lg disabled:opacity-40 hover:bg-zinc-700 transition-colors">
                  {parsing ? 'Parsing…' : 'Parse'}
                </button>
              </div>
            )}
            {parseErr && <p className="text-xs text-red-500">{parseErr}</p>}
          </section>
        )}
      </div>

      {parseResult && (
        <ParseConfirmation
          result={parseResult}
          onClose={() => setParseResult(null)}
          onApplied={() => { setParseResult(null); setParseUrl(''); window.location.reload() }}
        />
      )}
    </>
  )
}
