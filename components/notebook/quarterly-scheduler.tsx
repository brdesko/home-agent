'use client'

import { useState, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  useDroppable,
  useDraggable,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { GripVertical } from 'lucide-react'
import { type Project } from './project-card'
import { type QuarterlyBudget } from './budget-tab'

// ── Types ──────────────────────────────────────────────────────────────────────

type SchedulerProject = Project & { goal_id: string | null }

export type EffortLevel = 'none' | 'light' | 'moderate' | 'heavy' | 'intense'

type Quarter = { year: number; quarter: number; key: string; label: string }

// ── Constants ──────────────────────────────────────────────────────────────────

export const EFFORT_PTS: Record<string, number> = {
  low: 1, medium: 2, high: 4, very_high: 8,
}

export const EFFORT_COLORS: Record<EffortLevel, string | null> = {
  none:     null,
  light:    'oklch(0.60 0.12 155)',
  moderate: 'oklch(0.72 0.16 90)',
  heavy:    'oklch(0.65 0.20 50)',
  intense:  'oklch(0.55 0.22 20)',
}

const EFFORT_BG: Record<string, string> = {
  low:       'oklch(0.96 0.03 155)',
  medium:    'oklch(0.96 0.06 90)',
  high:      'oklch(0.95 0.06 50)',
  very_high: 'oklch(0.94 0.07 20)',
}

const EFFORT_LABEL: Record<string, string> = {
  low: 'Low', medium: 'Med', high: 'High', very_high: 'Very high',
}

const DOMAIN_COLORS: Record<string, string> = {
  renovation:    'oklch(0.68 0.14 65)',
  farm:          'oklch(0.50 0.10 155)',
  grounds:       'oklch(0.55 0.12 168)',
  maintenance:   'oklch(0.55 0.11 250)',
  'home-systems':'oklch(0.50 0.10 300)',
}

const EFFORT_LEVEL_LABELS: Record<EffortLevel, string> = {
  none: 'None', light: 'Light', moderate: 'Moderate', heavy: 'Heavy', intense: 'Intense',
}

// ── Helpers ────────────────────────────────────────────────────────────────────

export function getNextFourQuarters(): Quarter[] {
  const now = new Date()
  let y = now.getFullYear()
  let q = Math.ceil((now.getMonth() + 1) / 3)
  const result: Quarter[] = []
  for (let i = 0; i < 4; i++) {
    result.push({ year: y, quarter: q, key: `${y}-${q}`, label: `Q${q} ${y}` })
    q++
    if (q > 4) { q = 1; y++ }
  }
  return result
}

export function ptsToLevel(pts: number): EffortLevel {
  if (pts === 0)  return 'none'
  if (pts <= 2)   return 'light'
  if (pts <= 5)   return 'moderate'
  if (pts <= 7)   return 'heavy'
  return 'intense'
}

function quarterAllocation(qb: QuarterlyBudget): number {
  const net = qb.core_income + qb.additional_income - qb.core_expenses - qb.additional_expenses
  return Math.round(net * qb.allocation_pct) / 100
}

function fmtMoney(n: number): string {
  if (n >= 10000) return `$${Math.round(n / 1000)}k`
  if (n >= 1000)  return `$${(n / 1000).toFixed(1)}k`
  return `$${n}`
}

// ── Draggable project card ─────────────────────────────────────────────────────

function DraggableCard({ project }: { project: SchedulerProject }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: project.id })

  const domainColor = DOMAIN_COLORS[project.domain] ?? 'oklch(0.60 0.00 0)'
  const effortBg    = project.effort ? (EFFORT_BG[project.effort] ?? '') : ''

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
        borderLeftColor: domainColor,
        backgroundColor: effortBg || 'white',
        opacity: isDragging ? 0.35 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
        position: 'relative',
        zIndex: isDragging ? 1 : 'auto' as never,
      }}
      className="border border-zinc-200 border-l-[3px] rounded-lg px-2.5 py-2 select-none touch-none"
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <GripVertical className="w-3 h-3 text-zinc-300 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-zinc-800 leading-tight truncate">{project.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {project.effort && (
              <span className="text-[10px] text-zinc-500">{EFFORT_LABEL[project.effort]}</span>
            )}
            {(project.target_budget ?? 0) > 0 && (
              <span className="text-[10px] text-zinc-400">{fmtMoney(project.target_budget!)}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function OverlayCard({ project }: { project: SchedulerProject }) {
  const domainColor = DOMAIN_COLORS[project.domain] ?? 'oklch(0.60 0.00 0)'
  const effortBg    = project.effort ? (EFFORT_BG[project.effort] ?? '') : ''
  return (
    <div
      style={{ borderLeftColor: domainColor, backgroundColor: effortBg || 'white' }}
      className="border border-zinc-300 border-l-[3px] rounded-lg px-2.5 py-2 shadow-xl w-[158px] opacity-95 cursor-grabbing"
    >
      <p className="text-xs font-medium text-zinc-800 leading-tight truncate">{project.name}</p>
      {project.effort && (
        <p className="text-[10px] text-zinc-500 mt-0.5">{EFFORT_LABEL[project.effort]}</p>
      )}
    </div>
  )
}

// ── Quarter column ─────────────────────────────────────────────────────────────

function QuarterColumn({
  id, label, projects, effortLevel, allocation, budgetSum, isLater,
}: {
  id: string
  label: string
  projects: SchedulerProject[]
  effortLevel: EffortLevel
  allocation: number | null
  budgetSum: number
  isLater: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const effortColor = EFFORT_COLORS[effortLevel]

  const budgetPct = allocation != null && allocation > 0
    ? Math.round((budgetSum / allocation) * 100)
    : null

  const barColor = budgetPct == null ? 'oklch(0.50 0.10 155)'
    : budgetPct > 100 ? 'oklch(0.55 0.22 20)'
    : budgetPct > 80  ? 'oklch(0.65 0.20 50)'
    : 'oklch(0.50 0.10 155)'

  return (
    <div className="flex flex-col w-[168px] shrink-0 h-full">
      {/* Header */}
      <div className={`px-2.5 py-2 rounded-t-lg border border-b-0 ${isLater ? 'border-zinc-200 bg-zinc-50' : 'border-zinc-200 bg-white'}`}>
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className={`text-xs font-semibold ${isLater ? 'text-zinc-400' : 'text-zinc-700'}`}>{label}</span>
          {!isLater && effortColor && (
            <span
              className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full text-white leading-none"
              style={{ backgroundColor: effortColor }}
            >
              {EFFORT_LEVEL_LABELS[effortLevel]}
            </span>
          )}
        </div>

        {!isLater && (
          <div className="space-y-1">
            <div className="text-[10px] text-zinc-400">
              {projects.length} project{projects.length !== 1 ? 's' : ''}
              {budgetSum > 0 ? ` · ${fmtMoney(budgetSum)}` : ''}
            </div>
            {budgetPct != null && (
              <>
                <div className="h-1 bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, budgetPct)}%`, backgroundColor: barColor }}
                  />
                </div>
                <div className="text-[10px] text-zinc-400">
                  {budgetPct}% of {fmtMoney(allocation!)}
                </div>
              </>
            )}
          </div>
        )}

        {isLater && (
          <div className="text-[10px] text-zinc-400">
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto border border-zinc-200 rounded-b-lg p-1.5 space-y-1.5 transition-colors min-h-[80px] ${
          isOver
            ? 'bg-zinc-100 border-zinc-400'
            : isLater ? 'bg-zinc-50/60' : 'bg-white'
        }`}
      >
        {projects.map(p => <DraggableCard key={p.id} project={p} />)}
        {projects.length === 0 && (
          <div className="flex items-center justify-center h-12">
            <p className="text-[10px] text-zinc-300">Drop here</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────────

type Props = {
  projects: SchedulerProject[]
  quarterlyBudgets: QuarterlyBudget[]
  pending: Map<string, { year: number; quarter: number } | null>
  effortByKey: Record<string, EffortLevel>
  onMove: (projectId: string, dest: { year: number; quarter: number } | null) => void
  onSave: () => Promise<void>
  onDiscard: () => void
}

export function QuarterlyScheduler({ projects, quarterlyBudgets, pending, effortByKey, onMove, onSave, onDiscard }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [saving,   setSaving]   = useState(false)

  const quarters    = useMemo(() => getNextFourQuarters(), [])
  const validKeys   = useMemo(() => new Set(quarters.map(q => q.key)), [quarters])
  const budgetByKey = useMemo(() => {
    const m: Record<string, QuarterlyBudget> = {}
    for (const qb of quarterlyBudgets) m[`${qb.year}-${qb.quarter}`] = qb
    return m
  }, [quarterlyBudgets])

  const activeProject = useMemo(
    () => (activeId ? (projects.find(p => p.id === activeId) ?? null) : null),
    [activeId, projects]
  )

  const schedulable = useMemo(
    () => projects.filter(p => p.status !== 'cancelled' && p.status !== 'complete'),
    [projects]
  )

  const grouped = useMemo(() => {
    const g: Record<string, SchedulerProject[]> = {}
    for (const q of quarters) g[q.key] = []
    g['later'] = []

    for (const p of schedulable) {
      let key: string
      if (pending.has(p.id)) {
        const dest = pending.get(p.id)
        key = dest ? `${dest.year}-${dest.quarter}` : 'later'
      } else if (p.target_year && p.target_quarter) {
        const k = `${p.target_year}-${p.target_quarter}`
        key = validKeys.has(k) ? k : 'later'
      } else {
        key = 'later'
      }
      ;(g[key] ??= []).push(p)
    }
    return g
  }, [schedulable, pending, quarters, validKeys])

  const budgetSumByKey = useMemo(() => {
    const s: Record<string, number> = {}
    for (const [key, ps] of Object.entries(grouped)) {
      s[key] = ps.reduce((acc, p) => acc + (p.target_budget ?? 0), 0)
    }
    return s
  }, [grouped])

  function handleDragStart(e: DragStartEvent) { setActiveId(e.active.id as string) }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const { active, over } = e
    if (!over) return
    const destKey = over.id as string
    if (destKey === 'later') {
      onMove(active.id as string, null)
    } else {
      const q = quarters.find(q => q.key === destKey)
      if (q) onMove(active.id as string, { year: q.year, quarter: q.quarter })
    }
  }

  async function handleSave() {
    setSaving(true)
    try { await onSave() } finally { setSaving(false) }
  }

  return (
    <div className="flex flex-col h-full min-w-0">

      {/* Header */}
      <div className="flex items-start justify-between mb-3 shrink-0 gap-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-700">Quarterly Schedule</h3>
          <p className="text-[11px] text-zinc-400 mt-0.5">Drag projects between quarters to model changes</p>
        </div>
        {pending.size > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-zinc-400">{pending.size} unsaved</span>
            <button onClick={onDiscard} className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors">
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'oklch(0.50 0.10 155)' }}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        )}
      </div>

      {/* Columns */}
      <DndContext
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        collisionDetection={closestCenter}
      >
        <div className="flex-1 overflow-x-auto overflow-y-hidden min-h-0">
          <div className="flex gap-2 h-full pb-1" style={{ minWidth: 'max-content' }}>
            {quarters.map(q => {
              const qb = budgetByKey[q.key]
              return (
                <QuarterColumn
                  key={q.key}
                  id={q.key}
                  label={q.label}
                  projects={grouped[q.key] ?? []}
                  effortLevel={effortByKey[q.key] ?? 'none'}
                  allocation={qb ? quarterAllocation(qb) : null}
                  budgetSum={budgetSumByKey[q.key] ?? 0}
                  isLater={false}
                />
              )
            })}
            <QuarterColumn
              id="later"
              label="Later"
              projects={grouped['later'] ?? []}
              effortLevel="none"
              allocation={null}
              budgetSum={0}
              isLater
            />
          </div>
        </div>

        <DragOverlay>
          {activeProject && <OverlayCard project={activeProject} />}
        </DragOverlay>
      </DndContext>

      {/* Effort legend */}
      <div className="flex flex-wrap items-center gap-3 pt-2 shrink-0 border-t border-zinc-100 mt-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Effort</span>
        {(['light', 'moderate', 'heavy', 'intense'] as EffortLevel[]).map(lvl => (
          <div key={lvl} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: EFFORT_COLORS[lvl]! }} />
            <span className="text-[10px] text-zinc-500 capitalize">{lvl}</span>
          </div>
        ))}
        <span className="text-[10px] text-zinc-300 ml-1">·</span>
        <span className="text-[10px] text-zinc-400">Card background reflects effort level</span>
      </div>
    </div>
  )
}
