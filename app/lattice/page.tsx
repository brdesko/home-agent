import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Layers, Home, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getLatticeId } from '@/lib/get-lattice-id'

const BG          = 'oklch(0.97 0.03 85)'
const AMBER       = 'oklch(0.75 0.14 75)'
const AMBER_TEXT  = 'oklch(0.40 0.12 72)'
const GREEN       = 'oklch(0.50 0.10 155)'
const GREEN_TEXT  = 'oklch(0.36 0.10 155)'

export default async function LatticeHomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let latticeId = await getLatticeId(supabase, user.id)
  if (!latticeId) {
    const { data: created } = await supabase
      .from('lattices')
      .insert({ owner_id: user.id })
      .select('id')
      .single()
    latticeId = created?.id ?? null
  }
  if (!latticeId) redirect('/new-property')

  return (
    <div
      className="h-full flex flex-col items-center justify-center select-none"
      style={{ backgroundColor: BG }}
    >
      {/* Module widget strip */}
      <div className="flex items-end gap-5 mb-12">

        {/* Lattice — hub (active) */}
        <Widget
          label="Lattice"
          labelColor={AMBER_TEXT}
          bg={AMBER}
          icon={<Layers className="w-7 h-7 text-white" />}
        />

        {/* Parcel — navigate into domain */}
        <Link href="/" className="group">
          <Widget
            label="Parcel"
            labelColor={GREEN_TEXT}
            bg={GREEN}
            icon={<Home className="w-7 h-7 text-white" />}
            hoverable
          />
        </Link>

        {/* Personal — coming soon */}
        <Widget
          label="Personal"
          labelColor="oklch(0.62 0.02 85)"
          bg="oklch(0.91 0.02 85)"
          icon={<User className="w-6 h-6" style={{ color: 'oklch(0.70 0.03 85)' }} />}
          dimmed
        />

        {/* Placeholder */}
        <Widget
          label=""
          labelColor="transparent"
          bg="oklch(0.93 0.01 85)"
          icon={<span style={{ fontSize: 20, color: 'oklch(0.78 0.02 85)', letterSpacing: 2 }}>···</span>}
          veryDimmed
        />

      </div>

      {/* Wordmark */}
      <div className="text-center">
        <h1
          className="font-display leading-none"
          style={{ fontSize: 54, fontWeight: 300, letterSpacing: '-0.02em', color: AMBER_TEXT }}
        >
          Lattice
        </h1>
        <p className="mt-3 text-sm" style={{ color: 'oklch(0.56 0.06 78)' }}>
          Your personal operating system
        </p>
      </div>
    </div>
  )
}

function Widget({
  label,
  labelColor,
  bg,
  icon,
  hoverable,
  dimmed,
  veryDimmed,
}: {
  label: string
  labelColor: string
  bg: string
  icon: ReactNode
  hoverable?: boolean
  dimmed?: boolean
  veryDimmed?: boolean
}) {
  return (
    <div
      className="flex flex-col items-center gap-2.5"
      style={{ opacity: veryDimmed ? 0.18 : dimmed ? 0.32 : 1 }}
    >
      <div
        className={`w-[88px] h-[88px] rounded-[22px] flex items-center justify-center${hoverable ? ' transition-opacity group-hover:opacity-80' : ''}`}
        style={{ backgroundColor: bg }}
      >
        {icon}
      </div>
      <span
        className="text-[11px] font-semibold tracking-wide"
        style={{ color: labelColor }}
      >
        {label || ' '}
      </span>
    </div>
  )
}
