import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getPropertyId } from '@/lib/get-property-id'

const BUCKET = 'Home Agent'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const propertyId = await getPropertyId(supabase, user.id)
  if (!propertyId) return NextResponse.json({ error: 'No property found' }, { status: 404 })

  const { data: files, error } = await supabase.storage
    .from(BUCKET)
    .list(`${propertyId}/photos`, { limit: 500, sortBy: { column: 'created_at', order: 'desc' } })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results = await Promise.all(
    (files ?? []).filter(f => f.name !== '.emptyFolderPlaceholder').map(async f => {
      const path = `${propertyId}/photos/${f.name}`
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
      return {
        name:      f.name,
        path,
        size:      f.metadata?.size ?? 0,
        createdAt: f.created_at,
        signedUrl: signed?.signedUrl ?? null,
      }
    })
  )

  return NextResponse.json(results)
}
