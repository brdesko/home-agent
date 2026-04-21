import type { Metadata } from "next";
import { Geist_Mono, DM_Sans } from "next/font/google";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { getPropertyId } from "@/lib/get-property-id";
import { AppShell } from "@/components/app-shell";

const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const dmSans    = DM_Sans({ variable: "--font-sans", subsets: ["latin"], display: "swap", weight: ["300","400","500","600","700"] });

export type PropertyEntry = { id: string; name: string }

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { title: 'Parcel', description: 'Property Notebook' }
  const propertyId = await getPropertyId(supabase, user.id)
  if (!propertyId) return { title: 'Parcel', description: 'Property Notebook' }
  const { data } = await supabase.from('properties').select('name').eq('id', propertyId).single()
  return {
    title: data?.name ? `${data.name} · Parcel` : 'Parcel',
    description: 'Property Notebook',
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let currentPropertyId:   string | null = null
  let currentPropertyName: string | null = null
  let allProperties:       PropertyEntry[] = []
  let activeProjectCount = 0

  if (user) {
    const { data: memberships } = await supabase
      .from('property_members')
      .select('properties(id, name)')
      .eq('user_id', user.id)
      .order('created_at')

    const allIncluding = (memberships ?? [])
      .map(m => m.properties as unknown as PropertyEntry | null)
      .filter((p): p is PropertyEntry => !!p)

    if (allIncluding.length > 0) {
      const { data: archivedRows } = await supabase
        .from('properties')
        .select('id')
        .in('id', allIncluding.map(p => p.id))
        .eq('is_archived', true)
      const archivedIds = new Set((archivedRows ?? []).map(r => r.id))
      allProperties = allIncluding.filter(p => !archivedIds.has(p.id))
    }

    currentPropertyId = await getPropertyId(supabase, user.id)
    const current = allProperties.find(p => p.id === currentPropertyId)
    currentPropertyName = current?.name ?? allProperties[0]?.name ?? null

    if (currentPropertyId) {
      const { count } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('property_id', currentPropertyId)
        .eq('status', 'active')
      activeProjectCount = count ?? 0
    }
  }

  return (
    <html lang="en" className={`${dmSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="h-full">
        <AppShell
          user={user ? { email: user.email ?? '' } : null}
          propertyName={currentPropertyName}
          propertyId={currentPropertyId}
          allProperties={allProperties}
          activeProjectCount={activeProjectCount}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
