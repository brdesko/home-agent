import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getLatticeId } from '@/lib/get-lattice-id'

const SAGE = 'oklch(0.50 0.10 155)'
const Q_LABELS = ['', 'Q1', 'Q2', 'Q3', 'Q4']

type RecurrenceType = 'one_time' | 'annual' | 'monthly' | 'quarterly'

interface CommitmentRow {
  id: string
  name: string
  domain: string | null
  amount: number
  recurrence_type: RecurrenceType
  target_year: number | null
  target_quarter: number | null
}

function annualEquivalent(c: CommitmentRow, year: number): number {
  if (c.recurrence_type === 'annual')    return c.amount
  if (c.recurrence_type === 'monthly')   return c.amount * 12
  if (c.recurrence_type === 'quarterly') return c.amount * 4
  if (c.recurrence_type === 'one_time')  return (c.target_year == null || c.target_year === year) ? c.amount : 0
  return 0
}

function quarterOf(month: number) { return Math.ceil(month / 3) }

function fmt$(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

export default async function LatticeHomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const latticeId = await getLatticeId(supabase, user.id)
  if (!latticeId) redirect('/new-property')

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentQ    = quarterOf(now.getMonth() + 1)
  const nextQ       = currentQ === 4 ? 1 : currentQ + 1
  const nextQYear   = currentQ === 4 ? currentYear + 1 : currentYear

  const [commitmentsResult, membersResult] = await Promise.all([
    supabase
      .from('global_commitments')
      .select('id, name, domain, amount, recurrence_type, target_year, target_quarter')
      .eq('lattice_id', latticeId),
    supabase
      .from('property_members')
      .select('property_id')
      .eq('user_id', user.id)
      .eq('role', 'owner'),
  ])

  const commitments  = (commitmentsResult.data ?? []) as CommitmentRow[]
  const propertyIds  = (membersResult.data ?? []).map(m => m.property_id)

  const totalAnnualCommitted = commitments.reduce((sum, c) => sum + annualEquivalent(c, currentYear), 0)

  let parcelTargetBudget = 0
  let parcelActualSpend  = 0
  let activeCount        = 0
  let plannedCount       = 0
  const overBudget: Array<{ name: string; overage: number }> = []
  const upcoming: Array<{
    type: 'project' | 'commitment'
    name: string
    year: number
    quarter: number | null
    amount: number | undefined
    domain: string | null
  }> = []

  if (propertyIds.length > 0) {
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name, status, target_budget, actual_spend, target_year, target_quarter')
      .in('property_id', propertyIds)

    const rows = projects ?? []

    activeCount  = rows.filter(p => p.status === 'active').length
    plannedCount = rows.filter(p => p.status === 'planned').length

    const actionable = rows.filter(p => ['planned', 'active', 'on_hold'].includes(p.status))
    parcelTargetBudget = actionable.reduce((s, p) => s + (p.target_budget ?? 0), 0)
    parcelActualSpend  = rows.reduce((s, p) => s + (p.actual_spend ?? 0), 0)

    for (const p of rows) {
      if (p.target_budget != null && p.actual_spend != null && p.actual_spend > p.target_budget) {
        overBudget.push({ name: p.name, overage: p.actual_spend - p.target_budget })
      }
    }

    for (const p of actionable) {
      const inCurrent = p.target_year === currentYear && p.target_quarter === currentQ
      const inNext    = p.target_year === nextQYear    && p.target_quarter === nextQ
      const yearOnly  = p.target_year === currentYear  && p.target_quarter == null
      if (inCurrent || inNext || yearOnly) {
        upcoming.push({
          type:    'project',
          name:    p.name,
          year:    p.target_year ?? currentYear,
          quarter: p.target_quarter ?? null,
          amount:  p.target_budget ?? undefined,
          domain:  'parcel',
        })
      }
    }
  }

  for (const c of commitments) {
    const isQuarterlyNow =
      c.recurrence_type === 'quarterly' &&
      (c.target_quarter === currentQ || (c.target_year === nextQYear && c.target_quarter === nextQ))
    const isOneTimeNow =
      c.recurrence_type === 'one_time' &&
      (
        (c.target_year === currentYear && (c.target_quarter === currentQ || c.target_quarter == null)) ||
        (c.target_year === nextQYear    && c.target_quarter === nextQ)
      )
    if (isQuarterlyNow || isOneTimeNow) {
      upcoming.push({
        type:    'commitment',
        name:    c.name,
        year:    c.target_year ?? currentYear,
        quarter: c.target_quarter ?? null,
        amount:  c.amount,
        domain:  c.domain ?? null,
      })
    }
  }

  upcoming.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    if (a.quarter == null && b.quarter == null) return 0
    if (a.quarter == null) return 1
    if (b.quarter == null) return -1
    return a.quarter - b.quarter
  })

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-8 py-10">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">Lattice</h1>
            <span className="text-sm font-medium" style={{ color: SAGE }}>
              {Q_LABELS[currentQ]} · {currentYear}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Your operating picture across domains.
          </p>
        </div>

        {/* Flags */}
        {overBudget.length > 0 && (
          <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 space-y-1.5">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-amber-700">Budget flags</p>
            {overBudget.map((p, i) => (
              <p key={i} className="text-sm text-amber-800">
                <span className="font-medium">{p.name}</span>{' '}
                is {fmt$(p.overage)} over budget
              </p>
            ))}
          </div>
        )}

        {/* Financial snapshot */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <StatCard
            label="Annual commitments"
            value={totalAnnualCommitted > 0 ? fmt$(totalAnnualCommitted) : null}
            emptyHint="None set"
          />
          <StatCard
            label="Parcel budget"
            value={parcelTargetBudget > 0 ? fmt$(parcelTargetBudget) : null}
            emptyHint="No active projects"
          />
          <StatCard
            label="Parcel spent"
            value={parcelActualSpend > 0 ? fmt$(parcelActualSpend) : null}
            emptyHint="$0 logged"
          />
        </div>

        {/* Domains */}
        <div className="mb-8">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-3">Domains</p>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/"
              className="group rounded-xl border px-5 py-4 transition-colors hover:bg-muted/40"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold">Parcel</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: SAGE }} />
              </div>
              <p className="text-xs text-muted-foreground mb-3">Property and household operations</p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{activeCount}</span> active
                <span className="mx-1 opacity-30">·</span>
                <span className="font-semibold text-foreground">{plannedCount}</span> planned
              </div>
            </Link>

            <div className="rounded-xl border border-dashed px-5 py-4 opacity-40 cursor-default">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold">Personal</span>
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold">Soon</span>
              </div>
              <p className="text-xs text-muted-foreground">Finance, planning, and priorities</p>
            </div>
          </div>
        </div>

        {/* Upcoming */}
        <div>
          <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-3">
            Upcoming — {Q_LABELS[currentQ]} &amp; {Q_LABELS[nextQ]}
            {nextQYear !== currentYear && ` ${nextQYear}`}
          </p>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing scheduled for the current or next quarter.
            </p>
          ) : (
            <div className="divide-y">
              {upcoming.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="shrink-0 text-[9px] uppercase tracking-widest font-semibold px-1.5 py-0.5 rounded"
                      style={
                        item.type === 'project'
                          ? { backgroundColor: 'oklch(0.95 0.03 155)', color: 'oklch(0.38 0.10 155)' }
                          : { backgroundColor: 'oklch(0.95 0.03 260)', color: 'oklch(0.38 0.10 260)' }
                      }
                    >
                      {item.type === 'project' ? 'Parcel' : 'Commitment'}
                    </span>
                    <span className="text-sm truncate">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0 ml-4">
                    {item.amount != null && (
                      <span className="font-medium text-foreground">{fmt$(item.amount)}</span>
                    )}
                    <span>
                      {item.quarter ? `${Q_LABELS[item.quarter]} ${item.year}` : String(item.year)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Global Context nudge if no commitments */}
        {commitments.length === 0 && (
          <p className="mt-10 text-xs text-muted-foreground">
            Add financial commitments to the Global Context to see cross-domain planning signals here.
          </p>
        )}

      </div>
    </div>
  )
}

function StatCard({ label, value, emptyHint }: { label: string; value: string | null; emptyHint: string }) {
  return (
    <div className="rounded-xl border px-4 py-3.5">
      <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-1.5">{label}</p>
      {value != null ? (
        <p className="text-xl font-semibold tracking-tight">{value}</p>
      ) : (
        <p className="text-sm text-muted-foreground">{emptyHint}</p>
      )}
    </div>
  )
}
