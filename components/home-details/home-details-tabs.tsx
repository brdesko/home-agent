'use client'

import { useState } from 'react'
import { DetailsTab } from './details-tab'
import { DocumentsTab } from './documents-tab'
import { AssetsTab } from './assets-tab'
import { PhotosTab } from './photos-tab'
import { type Asset } from './asset-panel'
import { PropertyVisual } from '@/components/property-visual'

type PropertyDetails = {
  id: string; name: string; address: string | null
  acreage: number | null; year_built: number | null; sq_footage: number | null
  lot_size: string | null; heat_type: string | null; well_septic: string | null
  details_notes: string | null
}

type Doc = {
  name: string; path: string; size: number; mimeType: string
  createdAt: string; signedUrl: string | null
}

type Props = {
  property: PropertyDetails
  docs: Doc[]
  assets: Asset[]
  isOwner: boolean
}

const TABS = ['Visual', 'Assets', 'Photos', 'Documents', 'Details'] as const
type Tab = typeof TABS[number]

export function HomeDetailsTabs({ property, docs, assets, isOwner }: Props) {
  const [tab, setTab] = useState<Tab>('Details')

  return (
    <div>
      <div className="border-b border-zinc-200 px-6">
        <div className="max-w-4xl mx-auto flex gap-0">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-600'
              }`}>
              {t}
              {t === 'Documents' && docs.length > 0 && (
                <span className="ml-1.5 text-xs text-zinc-400">{docs.length}</span>
              )}
              {t === 'Assets' && assets.length > 0 && (
                <span className="ml-1.5 text-xs text-zinc-400">{assets.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {tab === 'Visual' ? (
        <div className="px-6 py-8">
          <PropertyVisual />
        </div>
      ) : (
        <div className="max-w-4xl mx-auto px-6 py-8">
          {tab === 'Details'   && <DetailsTab   property={property} isOwner={isOwner} />}
          {tab === 'Documents' && <DocumentsTab initial={docs}     isOwner={isOwner} />}
          {tab === 'Assets'    && <AssetsTab    initial={assets}   isOwner={isOwner} />}
          {tab === 'Photos'    && <PhotosTab />}
        </div>
      )}
    </div>
  )
}
