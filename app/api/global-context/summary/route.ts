import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getLatticeId } from '@/lib/get-lattice-id'

type RecurrenceType = 'one_time' | 'annual' | 'monthly' | 'quarterly'

interface Commitment {
  id: string
  name: string
  domain: string | null
  amount: number
  recurrence_type: RecurrenceType
  target_year: number | null
  target_quarter: number | null
}

interface Project {
  id: string
  name: string
  status: string
  target_budget: number | null
  actual_spend: number | null
  target_year: number | null
  target_quarter: number | null
  property_id: string
}

interface UpcomingItem {
  type: 'project' | 'commitment'
  id: string
  name: string
  year: number
  quarter: number | null
  amount: number | undefined
  domain: string | null
  property_name: string | null
}

interface ConflictItem {
  type: 'over_budget' | 'threshold_exceeded'
  severity: 'warning' | 'critical'
  message: string
  item_id: string | undefined
}

function annualEquivalent(c: Commitment, currentYear: number): number {
  if (c.recurrence_type === 'annual') return c.amount
  if (c.recurrence_type === 'monthly') return c.amount * 12
  if (c.recurrence_type === 'quarterly') return c.amount * 4
  // one_time: only counts if it falls in the current year (or has no year)
  if (c.recurrence_type === 'one_time') {
    return c.target_year == null || c.target_year === currentYear ? c.amount : 0
  }
  return 0
}

function quarterOf(month: number): number {
  return Math.ceil(month / 3)
}

const ACTIVE_STATUSES = new Set(['planned', 'active', 'on_hold'])

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const latticeId = await getLatticeId(supabase, user.id)
  if (!latticeId) return NextResponse.json({ error: 'No lattice found' }, { status: 404 })

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentQ = quarterOf(now.getMonth() + 1)
  const nextQ = currentQ === 4 ? 1 : currentQ + 1
  const nextQYear = currentQ === 4 ? currentYear + 1 : currentYear

  // Parallel: editable core + owned properties
  const [contextResult, commitmentsResult, membersResult] = await Promise.all([
    supabase
      .from('global_context')
      .select('thresholds')
      .eq('lattice_id', latticeId)
      .maybeSingle(),
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

  if (commitmentsResult.error) return NextResponse.json({ error: commitmentsResult.error.message }, { status: 500 })
  if (membersResult.error) return NextResponse.json({ error: membersResult.error.message }, { status: 500 })

  const thresholds = (contextResult.data?.thresholds ?? {}) as Record<string, number>
  const commitments = (commitmentsResult.data ?? []) as Commitment[]
  const propertyIds = (membersResult.data ?? []).map(m => m.property_id)

  // ── Commitments rollup ────────────────────────────────────────────────────

  let commitments_parcel = 0
  let commitments_personal = 0
  let commitments_unassigned = 0

  for (const c of commitments) {
    const ae = annualEquivalent(c, currentYear)
    if (c.domain === 'parcel') commitments_parcel += ae
    else if (c.domain === 'personal') commitments_personal += ae
    else commitments_unassigned += ae
  }

  const commitments_total = commitments_parcel + commitments_personal + commitments_unassigned

  // Short-circuit if no owned properties — return commitments data but empty Parcel data
  if (propertyIds.length === 0) {
    return NextResponse.json({
      as_of: now.toISOString(),
      current_year: currentYear,
      current_quarter: currentQ,
      finances: {
        commitments: {
          total_annual_equivalent: commitments_total,
          by_domain: { parcel: commitments_parcel, personal: commitments_personal, unassigned: commitments_unassigned },
        },
        parcel: { total_target_budget: 0, total_actual_spend: 0, quarterly_allocated: 0 },
        threshold_flags: [],
      },
      parcel: { project_counts: { active: 0, planned: 0, on_hold: 0, complete: 0 }, over_budget: [] },
      upcoming: [],
      conflicts: [],
    })
  }

  // Parallel: projects + quarterly budgets for current year
  const [projectsResult, budgetsResult, propertiesResult] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, status, target_budget, actual_spend, target_year, target_quarter, property_id')
      .in('property_id', propertyIds),
    supabase
      .from('quarterly_budget')
      .select('core_expenses, additional_expenses')
      .in('property_id', propertyIds)
      .eq('year', currentYear),
    supabase
      .from('properties')
      .select('id, name')
      .in('id', propertyIds),
  ])

  if (projectsResult.error) return NextResponse.json({ error: projectsResult.error.message }, { status: 500 })
  if (budgetsResult.error) return NextResponse.json({ error: budgetsResult.error.message }, { status: 500 })

  const projects = (projectsResult.data ?? []) as Project[]
  const budgets = budgetsResult.data ?? []

  const propertyNames: Record<string, string> = {}
  for (const p of propertiesResult.data ?? []) {
    propertyNames[p.id] = p.name
  }

  // ── Parcel financial rollup ───────────────────────────────────────────────

  const activeProjects = projects.filter(p => ACTIVE_STATUSES.has(p.status))

  const parcel_total_target = activeProjects.reduce((sum, p) => sum + (p.target_budget ?? 0), 0)
  const parcel_total_spent = projects.reduce((sum, p) => sum + (p.actual_spend ?? 0), 0)
  const parcel_quarterly_allocated = budgets.reduce(
    (sum, b) => sum + (b.core_expenses ?? 0) + (b.additional_expenses ?? 0),
    0
  )

  // ── Project counts ────────────────────────────────────────────────────────

  const project_counts = {
    active:   projects.filter(p => p.status === 'active').length,
    planned:  projects.filter(p => p.status === 'planned').length,
    on_hold:  projects.filter(p => p.status === 'on_hold').length,
    complete: projects.filter(p => p.status === 'complete').length,
  }

  // ── Over-budget projects ──────────────────────────────────────────────────

  const over_budget = projects
    .filter(p => p.target_budget != null && p.actual_spend != null && p.actual_spend > p.target_budget)
    .map(p => ({
      id: p.id,
      name: p.name,
      target_budget: p.target_budget!,
      actual_spend: p.actual_spend!,
      overage: p.actual_spend! - p.target_budget!,
      property_name: propertyNames[p.property_id] ?? null,
    }))

  // ── Upcoming items ────────────────────────────────────────────────────────
  // Projects and one-time/quarterly commitments due in current or next quarter.
  // Annual + monthly commitments belong in the financial rollup, not the upcoming list.

  const upcoming: UpcomingItem[] = []

  for (const p of activeProjects) {
    const inCurrentQ = p.target_year === currentYear && p.target_quarter === currentQ
    const inNextQ = p.target_year === nextQYear && p.target_quarter === nextQ
    const currentYearUnscheduled = p.target_year === currentYear && p.target_quarter == null
    if (inCurrentQ || inNextQ || currentYearUnscheduled) {
      upcoming.push({
        type: 'project',
        id: p.id,
        name: p.name,
        year: p.target_year ?? currentYear,
        quarter: p.target_quarter ?? null,
        amount: p.target_budget ?? undefined,
        domain: 'parcel',
        property_name: propertyNames[p.property_id] ?? null,
      })
    }
  }

  for (const c of commitments) {
    const isQuarterlyNow =
      c.recurrence_type === 'quarterly' &&
      ((c.target_quarter === currentQ) || (c.target_year === nextQYear && c.target_quarter === nextQ))
    const isOneTimeNow =
      c.recurrence_type === 'one_time' &&
      (
        (c.target_year === currentYear && (c.target_quarter === currentQ || c.target_quarter == null)) ||
        (c.target_year === nextQYear && c.target_quarter === nextQ)
      )
    if (isQuarterlyNow || isOneTimeNow) {
      upcoming.push({
        type: 'commitment',
        id: c.id,
        name: c.name,
        year: c.target_year ?? currentYear,
        quarter: c.target_quarter ?? null,
        amount: c.amount,
        domain: c.domain ?? null,
        property_name: null,
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

  // ── Threshold flags ───────────────────────────────────────────────────────

  const THRESHOLD_SOURCES: Record<string, { label: string; value: number }> = {
    parcel_annual_budget:   { label: 'Parcel annual budget',    value: parcel_total_target },
    parcel_annual_spend:    { label: 'Parcel annual spend',     value: parcel_total_spent },
    annual_commitments:     { label: 'Annual commitments',      value: commitments_total },
  }

  const threshold_flags = Object.entries(thresholds)
    .filter(([key]) => key in THRESHOLD_SOURCES)
    .map(([key, limit]) => {
      const { label, value: current } = THRESHOLD_SOURCES[key]
      const pct_used = limit > 0 ? Math.round((current / limit) * 100) : 0
      const status: 'ok' | 'warning' | 'exceeded' =
        current > limit ? 'exceeded' : current > limit * 0.85 ? 'warning' : 'ok'
      return { name: label, threshold: limit, current, pct_used, status }
    })

  // ── Conflicts ─────────────────────────────────────────────────────────────

  const conflicts: ConflictItem[] = [
    ...over_budget.map(p => ({
      type: 'over_budget' as const,
      severity: 'warning' as const,
      message: `"${p.name}" is $${p.overage.toLocaleString()} over budget`,
      item_id: p.id,
    })),
    ...threshold_flags
      .filter(f => f.status !== 'ok')
      .map(f => ({
        type: 'threshold_exceeded' as const,
        severity: (f.status === 'exceeded' ? 'critical' : 'warning') as 'critical' | 'warning',
        message: `${f.name}: $${f.current.toLocaleString()} of $${f.threshold.toLocaleString()} limit (${f.pct_used}%)`,
        item_id: undefined,
      })),
  ]

  return NextResponse.json({
    as_of: now.toISOString(),
    current_year: currentYear,
    current_quarter: currentQ,

    finances: {
      commitments: {
        total_annual_equivalent: commitments_total,
        by_domain: {
          parcel: commitments_parcel,
          personal: commitments_personal,
          unassigned: commitments_unassigned,
        },
      },
      parcel: {
        total_target_budget: parcel_total_target,
        total_actual_spend: parcel_total_spent,
        quarterly_allocated: parcel_quarterly_allocated,
      },
      threshold_flags,
    },

    parcel: {
      project_counts,
      over_budget,
    },

    upcoming,
    conflicts,
  })
}
