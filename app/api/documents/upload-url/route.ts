import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getPropertyId } from '@/lib/get-property-id'

const BUCKET = 'Home Agent'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const propertyId = await getPropertyId(supabase, user.id)
  if (!propertyId) return NextResponse.json({ error: 'No property found' }, { status: 404 })

  const { filename } = await req.json()
  const safeName = (filename as string).replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${propertyId}/${safeName}`

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path)
  if (error || !data) return NextResponse.json({ error: error?.message ?? 'Failed to create upload URL' }, { status: 500 })

  return NextResponse.json({ path, token: data.token, signedUrl: data.signedUrl })
}
