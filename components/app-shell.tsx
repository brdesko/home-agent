'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { BookOpen, MessageSquare, Home, Bookmark, ShoppingBag, ChevronDown, Archive, Trash2 } from 'lucide-react'
import SignOutButton from './sign-out-button'
import { FloatingChat } from './floating-chat'

const SIDEBAR_BG = 'oklch(0.16 0.012 80)'
const SAGE       = 'oklch(0.50 0.10 155)'

const NAV: { href: string; label: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; primary?: boolean }[] = [
  { href: '/',             label: 'Notebook',     icon: BookOpen,       primary: true },
  { href: '/agent',        label: 'Agent',        icon: MessageSquare,  primary: true },
  { href: '/home-details', label: 'Home Details', icon: Home },
  { href: '/references',   label: 'References',   icon: Bookmark },
  { href: '/purchases',    label: 'Purchases',    icon: ShoppingBag },
]

type PropertyEntry = { id: string; name: string }

type Props = {
  user: { email: string } | null
  propertyName: string | null
  propertyId:   string | null
  allProperties: PropertyEntry[]
  activeProjectCount?: number
  children: React.ReactNode
}

export function AppShell({ user, propertyName, propertyId, allProperties, activeProjectCount = 0, children }: Props) {
  const pathname    = usePathname()
  const router      = useRouter()
  const showSidebar = !!user && pathname !== '/login'

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if ((e.target as HTMLElement).isContentEditable) return
      if (e.key === 'g' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        router.push('/agent')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [router])

  if (!showSidebar) return <>{children}</>

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside style={{ backgroundColor: SIDEBAR_BG }} className="w-56 shrink-0 flex flex-col">

        {/* Wordmark */}
        <div className="px-5 pt-6 pb-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div style={{ backgroundColor: SAGE }} className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0">
              <Home className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-display text-[18px] text-white leading-none tracking-tight">Parcel</span>
          </div>
          {propertyName && (
            <PropertyDropdown
              propertyName={propertyName}
              propertyId={propertyId}
              allProperties={allProperties}
              router={router}
            />
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon, primary }) => {
            const active = pathname === href
            const linkStyle = active ? { backgroundColor: SAGE } : {}
            const textColor = active ? 'white' : primary ? 'oklch(1 0 0 / 0.90)' : 'oklch(1 0 0 / 0.55)'
            const iconColor = active ? 'white' : primary ? 'oklch(1 0 0 / 0.80)' : 'oklch(1 0 0 / 0.40)'
            const showBadge = href === '/' && activeProjectCount > 0
            return (
              <Link
                key={href}
                href={href}
                style={linkStyle}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active ? 'font-medium' : primary ? 'font-medium hover:bg-white/10' : 'hover:bg-white/8'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" style={{ color: iconColor }} />
                <span style={{ color: textColor }}>{label}</span>
                {showBadge && (
                  <span
                    className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none"
                    style={{ backgroundColor: active ? 'rgba(255,255,255,0.25)' : SAGE, color: 'white' }}
                  >
                    {activeProjectCount}
                  </span>
                )}
              </Link>
            )
          })}

          {/* Keyboard shortcut hint */}
          <div className="px-3 pt-4 mt-2">
            <p className="text-[10px]" style={{ color: 'oklch(1 0 0 / 0.22)' }}>
              Press <kbd className="font-mono bg-white/10 px-1 py-0.5 rounded text-[9px]">G</kbd> to open Agent
            </p>
          </div>
        </nav>

        {/* User + sign out */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-2.5">
            <div
              style={{ backgroundColor: SAGE }}
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white text-[11px] font-semibold tracking-wide"
            >
              {user.email.split('@')[0].slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] truncate" style={{ color: 'oklch(1 0 0 / 0.50)' }}>{user.email}</p>
              <SignOutButton />
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden flex flex-col bg-background">
        {children}
      </main>

      {/* Persistent floating chat — mounted here so it survives page navigation */}
      <FloatingChat />
    </div>
  )
}

type DropdownProps = {
  propertyName:  string
  propertyId:    string | null
  allProperties: PropertyEntry[]
  router: ReturnType<typeof useRouter>
}

function PropertyDropdown({ propertyName, propertyId, allProperties, router }: DropdownProps) {
  const [open, setOpen]           = useState(false)
  const [mode, setMode]           = useState<'idle' | 'newProperty' | 'newPropertySuccess' | 'archiveConfirm' | 'deleteConfirm1' | 'deleteConfirm2'>('idle')
  const [busy, setBusy]           = useState(false)
  const [err,  setErr]            = useState<string | null>(null)
  const [newName, setNewName]     = useState('')
  const [newAddr, setNewAddr]     = useState('')
  const ref                       = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setMode('idle')
        setErr(null)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function close() { setOpen(false); setMode('idle'); setErr(null); setNewName(''); setNewAddr('') }

  async function createProperty() {
    const name = newName.trim()
    if (!name) { setErr('Property name is required'); return }
    setBusy(true); setErr(null)
    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, address: newAddr.trim() || null }),
      })
      if (!res.ok) { const b = await res.json().catch(() => ({})); setErr(b.error ?? 'Failed'); return }
      const newProp = await res.json()
      // Switch to the new property immediately
      await fetch('/api/property/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property_id: newProp.id }),
      })
      setMode('newPropertySuccess')
      setNewName(''); setNewAddr('')
    } catch { setErr('Network error') }
    finally { setBusy(false) }
  }

  async function archiveProperty() {
    setBusy(true); setErr(null)
    try {
      const res = await fetch('/api/property', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_archived: true }),
      })
      if (!res.ok) { const b = await res.json().catch(() => ({})); setErr(b.error ?? 'Failed'); return }
      // Clear the cookie so getPropertyId falls back to the next active property
      await fetch('/api/property/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: null }),
      })
      close()
      router.push('/')
      router.refresh()
    } catch { setErr('Network error') }
    finally { setBusy(false) }
  }

  async function deleteProperty() {
    setBusy(true); setErr(null)
    try {
      const res = await fetch('/api/property', { method: 'DELETE' })
      if (!res.ok) { const b = await res.json().catch(() => ({})); setErr(b.error ?? 'Failed'); return }
      close()
      router.push('/login')
    } catch { setErr('Network error') }
    finally { setBusy(false) }
  }

  return (
    <div ref={ref} className="relative mt-3">
      <button
        onClick={() => { setOpen(o => !o); setMode('idle'); setErr(null) }}
        className="w-full flex items-center justify-between gap-1 group"
      >
        <p className="text-[17px] font-normal leading-snug tracking-tight text-left truncate" style={{ color: 'oklch(1 0 0 / 0.84)' }}>
          {propertyName}
        </p>
        <ChevronDown
          className="w-3.5 h-3.5 shrink-0 transition-transform"
          style={{ color: 'oklch(1 0 0 / 0.35)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-56 rounded-xl shadow-xl border border-white/10 overflow-hidden z-50"
          style={{ backgroundColor: 'oklch(0.20 0.012 80)' }}>

          {/* Current property */}
          <div className="px-4 py-3 border-b border-white/8">
            <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: 'oklch(1 0 0 / 0.30)' }}>Current property</p>
            <p className="text-sm font-medium" style={{ color: 'oklch(1 0 0 / 0.85)' }}>{propertyName}</p>
          </div>

          {/* Other properties */}
          <div className="border-b border-white/8">
            {allProperties.filter(p => p.id !== propertyId).length === 0 ? (
              <p className="px-4 py-2 text-xs italic" style={{ color: 'oklch(1 0 0 / 0.25)' }}>No other properties</p>
            ) : (
              allProperties.filter(p => p.id !== propertyId).map(p => (
                <button
                  key={p.id}
                  onClick={async () => {
                    await fetch('/api/property/switch', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ property_id: p.id }),
                    })
                    close()
                    router.push('/')
                    router.refresh()
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-white/6"
                  style={{ color: 'oklch(1 0 0 / 0.70)' }}
                >
                  {p.name}
                </button>
              ))
            )}
          </div>

          {/* Actions */}
          {mode === 'idle' && (
            <div className="py-1">
              <button
                onClick={() => { setMode('newProperty'); setErr(null) }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors hover:bg-white/6"
                style={{ color: 'oklch(1 0 0 / 0.70)' }}
              >
                <span className="text-base leading-none" style={{ color: 'oklch(1 0 0 / 0.50)' }}>+</span>
                New property
              </button>
              {allProperties.length > 1 && (
                <button
                  onClick={() => setMode('archiveConfirm')}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors hover:bg-white/6"
                  style={{ color: 'oklch(1 0 0 / 0.55)' }}
                >
                  <Archive className="w-3.5 h-3.5 shrink-0" />
                  Archive this property
                </button>
              )}
              <button
                onClick={() => setMode('deleteConfirm1')}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors hover:bg-white/6"
                style={{ color: 'oklch(0.65 0.15 20)' }}
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                Delete this property
              </button>
            </div>
          )}

          {mode === 'newProperty' && (
            <div className="px-4 py-3 space-y-2">
              <p className="text-xs font-medium" style={{ color: 'oklch(1 0 0 / 0.60)' }}>New property</p>
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createProperty()}
                placeholder="Property name"
                className="w-full text-xs rounded-lg px-3 py-1.5 focus:outline-none"
                style={{ backgroundColor: 'oklch(1 0 0 / 0.08)', color: 'oklch(1 0 0 / 0.80)', caretColor: 'oklch(1 0 0 / 0.80)' }}
              />
              <input
                value={newAddr}
                onChange={e => setNewAddr(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createProperty()}
                placeholder="Address (optional)"
                className="w-full text-xs rounded-lg px-3 py-1.5 focus:outline-none"
                style={{ backgroundColor: 'oklch(1 0 0 / 0.08)', color: 'oklch(1 0 0 / 0.80)', caretColor: 'oklch(1 0 0 / 0.80)' }}
              />
              {err && <p className="text-xs" style={{ color: 'oklch(0.65 0.15 20)' }}>{err}</p>}
              <div className="flex gap-2">
                <button
                  disabled={busy || !newName.trim()}
                  onClick={createProperty}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
                  style={{ backgroundColor: 'oklch(0.50 0.10 155)', color: 'white' }}
                >
                  {busy ? 'Creating…' : 'Create'}
                </button>
                <button
                  onClick={() => { setMode('idle'); setErr(null) }}
                  className="flex-1 py-1.5 rounded-lg text-xs transition-colors"
                  style={{ color: 'oklch(1 0 0 / 0.40)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {mode === 'newPropertySuccess' && (
            <div className="px-4 py-3 space-y-2">
              <p className="text-xs font-medium" style={{ color: 'oklch(0.70 0.12 155)' }}>Property created and switched.</p>
              <p className="text-[11px] leading-relaxed" style={{ color: 'oklch(1 0 0 / 0.40)' }}>
                Reload the page to see the new property in the sidebar.
              </p>
              <button
                onClick={() => { close(); router.push('/'); router.refresh() }}
                className="text-xs font-medium"
                style={{ color: 'oklch(0.70 0.12 155)' }}
              >
                Reload now →
              </button>
            </div>
          )}

          {mode === 'archiveConfirm' && (
            <div className="px-4 py-3 space-y-2">
              <p className="text-xs leading-relaxed" style={{ color: 'oklch(1 0 0 / 0.60)' }}>
                Archive hides this property from active views but keeps all data intact.
              </p>
              {err && <p className="text-xs" style={{ color: 'oklch(0.65 0.15 20)' }}>{err}</p>}
              <div className="flex gap-2">
                <button
                  disabled={busy}
                  onClick={archiveProperty}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                  style={{ backgroundColor: 'oklch(1 0 0 / 0.10)', color: 'oklch(1 0 0 / 0.80)' }}
                >
                  {busy ? 'Archiving…' : 'Archive'}
                </button>
                <button
                  onClick={() => { setMode('idle'); setErr(null) }}
                  className="flex-1 py-1.5 rounded-lg text-xs transition-colors"
                  style={{ color: 'oklch(1 0 0 / 0.40)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {mode === 'deleteConfirm1' && (
            <div className="px-4 py-3 space-y-2">
              <p className="text-xs leading-relaxed" style={{ color: 'oklch(0.75 0.12 20)' }}>
                This permanently deletes all projects, tasks, budget lines, and timeline events for this property. This cannot be undone.
              </p>
              {err && <p className="text-xs" style={{ color: 'oklch(0.65 0.15 20)' }}>{err}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => setMode('deleteConfirm2')}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{ backgroundColor: 'oklch(0.45 0.18 20)', color: 'white' }}
                >
                  I understand, continue
                </button>
                <button
                  onClick={() => { setMode('idle'); setErr(null) }}
                  className="flex-1 py-1.5 rounded-lg text-xs transition-colors"
                  style={{ color: 'oklch(1 0 0 / 0.40)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {mode === 'deleteConfirm2' && (
            <div className="px-4 py-3 space-y-2">
              <p className="text-xs font-medium" style={{ color: 'oklch(0.75 0.12 20)' }}>
                Are you absolutely sure? Click below to permanently delete.
              </p>
              {err && <p className="text-xs" style={{ color: 'oklch(0.65 0.15 20)' }}>{err}</p>}
              <div className="flex gap-2">
                <button
                  disabled={busy}
                  onClick={deleteProperty}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                  style={{ backgroundColor: 'oklch(0.45 0.18 20)', color: 'white' }}
                >
                  {busy ? 'Deleting…' : 'Delete permanently'}
                </button>
                <button
                  onClick={() => { setMode('idle'); setErr(null) }}
                  className="flex-1 py-1.5 rounded-lg text-xs transition-colors"
                  style={{ color: 'oklch(1 0 0 / 0.40)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Agent note */}
          <div className="px-4 py-3 border-t border-white/8">
            <p className="text-[11px] leading-relaxed" style={{ color: 'oklch(1 0 0 / 0.28)' }}>
              Archived projects can be unarchived — ask the Agent which projects are archived and it can restore them.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
