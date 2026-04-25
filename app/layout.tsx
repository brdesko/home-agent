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
  if (!user) return { title: 'Lattice', description: 'Your personal operating system' }
  const propertyId = await getPropertyId(supabase, user.id)
  if (!propertyId) return { title: 'Lattice', description: 'Your personal operating system' }
  const { data } = await supabase.from('properties').select('name').eq('id', propertyId).single()
  return {
    title: data?.name ? `${data.name} · Lattice` : 'Lattice',
    description: 'Your personal operating system',
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
    // Two separate queries avoids nested-join RLS evaluation issues
    const { data: membershipRows } = await supabase
      .from('property_members')
      .select('property_id')
      .eq('user_id', user.id)
      .order('created_at')

    const memberPropertyIds = (membershipRows ?? [])
      .map(m => m.property_id as string)
      .filter(Boolean)

    if (memberPropertyIds.length > 0) {
      const [{ data: propertiesData }, { data: archivedRows }] = await Promise.all([
        supabase.from('properties').select('id, name').in('id', memberPropertyIds),
        supabase.from('properties').select('id').in('id', memberPropertyIds).eq('is_archived', true),
      ])
      const archivedIds = new Set((archivedRows ?? []).map(r => r.id))
      allProperties = ((propertiesData ?? []) as PropertyEntry[]).filter(p => !archivedIds.has(p.id))
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
