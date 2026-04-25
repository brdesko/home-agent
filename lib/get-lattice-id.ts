import { createClient } from '@/lib/supabase/server'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

// Lattice is 1:1 with a user — no cookie or switcher needed.
export async function getLatticeId(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('lattices')
    .select('id')
    .eq('owner_id', userId)
    .single()

  return data?.id ?? null
}
