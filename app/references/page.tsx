import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

type SavedReference = {
  id: string
  type: 'vendor' | 'brand' | 'resource'
  name: string
  notes: string | null
  url: string | null
  created_at: string
}

const TYPE_LABELS: Record<string, string> = {
  vendor:   'Trusted Vendors',
  brand:    'Preferred Brands',
  resource: 'Resources',
}

const TYPE_ORDER = ['vendor', 'brand', 'resource']

export default async function ReferencesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: memberships } = await supabase
    .from('property_members')
    .select('role, properties(id, name)')
    .eq('user_id', user.id)
    .limit(1)

  if (!memberships || memberships.length === 0) redirect('/login')

  const property   = memberships[0].properties as unknown as { id: string; name: string }
  const propertyId = property.id

  const { data } = await supabase
    .from('saved_references')
    .select('*')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false })

  const references = (data ?? []) as SavedReference[]

  const grouped: Record<string, SavedReference[]> = {}
  for (const type of TYPE_ORDER) {
    const inType = references.filter(r => r.type === type)
    if (inType.length > 0) grouped[type] = inType
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">References</p>
          <h1 className="text-xl font-semibold text-zinc-900">{property.name}</h1>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/agent" className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors">
            Agent →
          </Link>
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors">
            ← Notebook
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-10">
        {Object.keys(grouped).length === 0 ? (
          <div className="text-center py-20">
            <p className="text-zinc-400 text-sm">No references saved yet.</p>
            <p className="text-zinc-300 text-xs mt-1">
              Ask the Agent to save a vendor, brand, or resource after completing a project task.
            </p>
          </div>
        ) : (
          Object.entries(grouped).map(([type, items]) => (
            <section key={type}>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-4">
                {TYPE_LABELS[type] ?? type}
              </h2>
              <div className="space-y-3">
                {items.map(ref => (
                  <div key={ref.id} className="border border-zinc-200 rounded-lg p-4 space-y-1.5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium text-zinc-900 leading-snug">{ref.name}</p>
                      {ref.url && (
                        <a
                          href={ref.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-zinc-400 hover:text-zinc-700 underline underline-offset-2 shrink-0 transition-colors"
                        >
                          Link ↗
                        </a>
                      )}
                    </div>
                    {ref.notes && (
                      <p className="text-sm text-zinc-500 leading-relaxed">{ref.notes}</p>
                    )}
                    <p className="text-xs text-zinc-300">
                      {new Date(ref.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  )
}
