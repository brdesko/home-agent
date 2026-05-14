import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Layers, Home, TrendingUp, Flower2, Zap, Sprout, Gamepad2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getLatticeId } from '@/lib/get-lattice-id'

const BG = 'oklch(0.97 0.03 85)'

type Module = {
  label: string
  bg: string
  labelColor: string
  Icon: LucideIcon
  href?: string
  soon?: boolean
  outlined?: boolean
}

const DOMAIN_MODULES: Module[] = [
  {
    label:      'Lattice',
    bg:         'oklch(0.75 0.14 75)',
    labelColor: 'oklch(0.40 0.12 72)',
    Icon:       Layers,
  },
  {
    label:      'Parcel',
    bg:         'oklch(0.50 0.10 155)',
    labelColor: 'oklch(0.36 0.10 155)',
    Icon:       Home,
    href:       '/',
  },
  {
    label:      'Arc',
    bg:         'oklch(0.42 0.20 265)',
    labelColor: 'oklch(0.28 0.16 265)',
    Icon:       TrendingUp,
    soon:       true,
  },
  {
    label:      'Bloom',
    bg:         'oklch(0.62 0.15 355)',
    labelColor: 'oklch(0.40 0.12 355)',
    Icon:       Flower2,
    soon:       true,
  },
  {
    label:      'Form',
    bg:         'oklch(0.63 0.17 25)',
    labelColor: 'oklch(0.42 0.14 25)',
    Icon:       Zap,
    soon:       true,
  },
  {
    label:      'Tend',
    bg:         'oklch(0.58 0.14 48)',
    labelColor: 'oklch(0.38 0.12 48)',
    Icon:       Sprout,
    soon:       true,
  },
]

const CONTROL_PANEL_MODULE: Module = {
  label:      'Control Panel',
  bg:         'white',
  labelColor: 'oklch(0.25 0 0)',
  Icon:       Gamepad2,
  soon:       true,
  outlined:   true,
}

export default async function LatticeHomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let latticeId = await getLatticeId(supabase, user.id)
  if (!latticeId) {
    const { data: created } = await supabase
      .from('lattices')
      .insert({ owner_id: user.id, name: 'My Lattice' })
      .select('id')
      .single()
    latticeId = created?.id ?? null
  }
  if (!latticeId) redirect('/new-property')

  // Control Panel is owner-only. ADMIN_USER_ID env var gates it.
  // If unset (single-user personal deployment), shows by default.
  const adminUserId = process.env.ADMIN_USER_ID
  const isAdmin = !adminUserId || user.id === adminUserId
  const modules = isAdmin ? [...DOMAIN_MODULES, CONTROL_PANEL_MODULE] : DOMAIN_MODULES

  return (
    <div
      className="h-full flex flex-col items-center justify-center select-none"
      style={{ backgroundColor: BG }}
    >
      {/* Module widget strip */}
      <div className="flex items-end gap-4 mb-12">
        {modules.map(({ label, bg, labelColor, Icon, href, soon, outlined }) => {
          const widget = (
            <Widget
              label={label}
              bg={bg}
              labelColor={labelColor}
              Icon={Icon}
              soon={soon}
              outlined={outlined}
              hoverable={!!href}
            />
          )
          if (href) {
            return (
              <Link key={label} href={href} className="group">
                {widget}
              </Link>
            )
          }
          return <div key={label}>{widget}</div>
        })}
      </div>

      {/* Wordmark */}
      <div className="text-center">
        <h1
          className="font-display leading-none"
          style={{ fontSize: 54, fontWeight: 300, letterSpacing: '-0.02em', color: 'oklch(0.40 0.12 72)' }}
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
  bg,
  labelColor,
  Icon,
  soon,
  outlined,
  hoverable,
}: {
  label: string
  bg: string
  labelColor: string
  Icon: LucideIcon
  soon?: boolean
  outlined?: boolean
  hoverable?: boolean
}) {
  return (
    <div
      className="flex flex-col items-center gap-2.5"
      style={{ opacity: soon ? 0.42 : 1 }}
    >
      <div
        className={`w-[88px] h-[88px] rounded-[22px] flex items-center justify-center${hoverable ? ' transition-opacity group-hover:opacity-80' : ''}`}
        style={{
          backgroundColor: bg,
          border: outlined ? '1.5px solid oklch(0.28 0 0)' : undefined,
        }}
      >
        <Icon
          className="w-7 h-7"
          style={{ color: outlined ? 'oklch(0.25 0 0)' : 'white' }}
        />
      </div>
      <span className="text-[11px] font-semibold tracking-wide" style={{ color: labelColor }}>
        {label}
      </span>
    </div>
  )
}
