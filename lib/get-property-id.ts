import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

export async function getPropertyId(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const cookieStore = await cookies()
  const cookiePropertyId = cookieStore.get('parcel_property_id')?.value

  if (cookiePropertyId) {
    const { data } = await supabase
      .from('property_members')
      .select('property_id, properties(is_archived)')
      .eq('property_id', cookiePropertyId)
      .eq('user_id', userId)
      .single()
    const archived = (data?.properties as unknown as { is_archived: boolean } | null)?.is_archived
    if (data?.property_id && !archived) return data.property_id
  }

  // Fallback: first non-archived property
  const { data } = await supabase
    .from('property_members')
    .select('property_id, properties(is_archived)')
    .eq('user_id', userId)
    .order('created_at')

  const active = (data ?? []).find(m => {
    const p = m.properties as unknown as { is_archived: boolean } | null
    return !p?.is_archived
  })
  return active?.property_id ?? null
}
