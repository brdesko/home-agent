import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

export async function getPropertyId(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const cookieStore = await cookies()
  const cookiePropertyId = cookieStore.get('parcel_property_id')?.value

  if (cookiePropertyId) {
    const { data: membership } = await supabase
      .from('property_members')
      .select('property_id')
      .eq('property_id', cookiePropertyId)
      .eq('user_id', userId)
      .single()

    if (membership?.property_id) {
      const { data: prop } = await supabase
        .from('properties')
        .select('is_archived')
        .eq('id', cookiePropertyId)
        .single()
      if (!prop?.is_archived) return cookiePropertyId
    }
  }

  // Fallback: first non-archived property this user is a member of
  const { data: memberships } = await supabase
    .from('property_members')
    .select('property_id')
    .eq('user_id', userId)
    .order('created_at')

  for (const m of memberships ?? []) {
    const { data: prop } = await supabase
      .from('properties')
      .select('is_archived')
      .eq('id', m.property_id)
      .single()
    if (!prop?.is_archived) return m.property_id
  }

  return null
}
