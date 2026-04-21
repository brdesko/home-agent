import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPropertyId } from '@/lib/get-property-id'
import { PurchasesView } from '@/components/purchases/purchases-view'
import { type Purchase } from '@/components/purchases/purchase-panel'

export default async function PurchasesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const propertyId = await getPropertyId(supabase, user.id)
  if (!propertyId) redirect('/login')

  const [{ data: purchaseData }, { data: projectData }] = await Promise.all([
    supabase
      .from('purchases')
      .select('*, projects(name)')
      .eq('property_id', propertyId)
      .order('purchased_at', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('projects')
      .select('id, name')
      .eq('property_id', propertyId)
      .neq('status', 'cancelled')
      .order('name'),
  ])

  const purchases = (purchaseData ?? []) as Purchase[]
  const projects  = (projectData  ?? []) as { id: string; name: string }[]

  return <PurchasesView initialPurchases={purchases} projects={projects} />
}
