import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPropertyId } from '@/lib/get-property-id'
import { ReferencesView } from '@/components/references/references-view'

type SavedReference = {
  id: string
  type: 'vendor' | 'brand' | 'resource'
  name: string
  notes: string | null
  url: string | null
  created_at: string
}

export default async function ReferencesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const propertyId = await getPropertyId(supabase, user.id)
  if (!propertyId) redirect('/login')

  const { data } = await supabase
    .from('saved_references')
    .select('*')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false })

  const references = (data ?? []) as SavedReference[]

  return <ReferencesView initialRefs={references} />
}
