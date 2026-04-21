import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { getPropertyId } from "@/lib/get-property-id";
import { AppShell } from "@/components/app-shell";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const playfair  = Playfair_Display({ variable: "--font-display", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Parcel",
  description: "Property Notebook",
};

export type PropertyEntry = { id: string; name: string }

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let currentPropertyId:   string | null = null
  let currentPropertyName: string | null = null
  let allProperties:       PropertyEntry[] = []

  if (user) {
    const { data: memberships } = await supabase
      .from('property_members')
      .select('properties(id, name)')
      .eq('user_id', user.id)
      .order('created_at')

    const allIncluding = (memberships ?? [])
      .map(m => m.properties as unknown as PropertyEntry | null)
      .filter((p): p is PropertyEntry => !!p)

    // Filter out archived properties via a separate query
    const { data: archivedRows } = await supabase
      .from('properties')
      .select('id')
      .in('id', allIncluding.map(p => p.id))
      .eq('is_archived', true)

    const archivedIds = new Set((archivedRows ?? []).map(r => r.id))
    allProperties = allIncluding.filter(p => !archivedIds.has(p.id))

    currentPropertyId = await getPropertyId(supabase, user.id)
    const current = allProperties.find(p => p.id === currentPropertyId)
    currentPropertyName = current?.name ?? allProperties[0]?.name ?? null
  }

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full antialiased`}>
      <body className="h-full">
        <AppShell
          user={user ? { email: user.email ?? '' } : null}
          propertyName={currentPropertyName}
          propertyId={currentPropertyId}
          allProperties={allProperties}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
