import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

export async function getPropertyId(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const cookieStore = await cookies()
  const cookiePropertyId = cookieStore.get('parcel_property_id')?.value

  if (cookiePropertyId) {
    const { data } = await supabase
      .from('property_members')
      .select('property_id')
      .eq('property_id', cookiePropertyId)
      .eq('user_id', userId)
      .single()
    if (data?.property_id) return data.property_id
  }

  const { data } = await supabase
    .from('property_members')
    .select('property_id')
    .eq('user_id', userId)
    .limit(1)
    .single()
  return data?.property_id ?? null
}
