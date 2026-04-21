import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPropertyId } from '@/lib/get-property-id'
import { HomeDetailsTabs } from '@/components/home-details/home-details-tabs'
import { type Asset } from '@/components/home-details/asset-panel'


function locationSubtitle(name: string, address: string | null): string | null {
  if (!address) return null
  const lower = address.toLowerCase()
  if (lower.startsWith(name.toLowerCase())) {
    return address.slice(name.length).replace(/^[,\s]+/, '') || null
  }
  return address
}
const BUCKET = 'Home Agent'

export default async function HomeDetailsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const propertyId = await getPropertyId(supabase, user.id)
  if (!propertyId) redirect('/login')

  const { data: membership, error: memberErr } = await supabase
    .from('property_members')
    .select('role, properties(id, name, address)')
    .eq('user_id', user.id)
    .eq('property_id', propertyId)
    .single()

  if (memberErr) { console.error('[home-details] membership query error:', memberErr.message) }
  if (!membership) redirect('/login')

  const baseProp = membership.properties as unknown as { id: string; name: string; address: string | null }
  const isOwner  = membership.role === 'owner'

  // Fetch detail columns separately (added in migration 017)
  const { data: detailData } = await supabase
    .from('properties')
    .select('acreage, year_built, sq_footage, lot_size, heat_type, well_septic, details_notes')
    .eq('id', baseProp.id)
    .single()

  const property = { ...baseProp, ...(detailData ?? { acreage: null, year_built: null, sq_footage: null, lot_size: null, heat_type: null, well_septic: null, details_notes: null }) }

  const [assetsResult, storageResult] = await Promise.all([
    supabase.from('assets').select('*').eq('property_id', baseProp.id).order('asset_type').order('name'),
    supabase.storage.from(BUCKET).list(`${baseProp.id}`, { limit: 200, sortBy: { column: 'created_at', order: 'desc' } }),
  ])

  const assets = (assetsResult.data ?? []) as Asset[]

  // Build signed URLs for each document
  const rawFiles = (storageResult.data ?? []).filter(f => f.name !== '.emptyFolderPlaceholder')
  const docs = await Promise.all(
    rawFiles.map(async f => {
      const path = `${baseProp.id}/${f.name}`
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
      return {
        name:      f.name,
        path,
        size:      f.metadata?.size ?? 0,
        mimeType:  f.metadata?.mimetype ?? '',
        createdAt: f.created_at ?? '',
        signedUrl: signed?.signedUrl ?? null,
      }
    })
  )

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-8 pt-7 pb-4 border-b border-zinc-100">
        <h1 className="text-[28px] font-display text-zinc-800 leading-tight">Home Details</h1>
        <p className="text-sm text-zinc-500 mt-1 font-medium">
          {property.name}{locationSubtitle(property.name, property.address ?? null) ? ` · ${locationSubtitle(property.name, property.address ?? null)}` : ''}
        </p>
      </div>

      <HomeDetailsTabs property={property} docs={docs} assets={assets} isOwner={isOwner} />
    </div>
  )
}
