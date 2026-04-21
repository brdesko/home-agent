'use client'

import { useState, useRef } from 'react'
import { ChevronLeft, ChevronRight, X, Trash2 } from 'lucide-react'
import { type TimelineEvent } from '../timeline-panel'

const SAGE = 'oklch(0.50 0.10 155)'

export type CalendarEvent = {
  id: string
  title: string
  start_date: string
  end_date: string
  type: 'vacation' | 'holiday' | 'busy' | 'sale_window' | 'other'
  notes: string | null
  created_at: string
}

const TYPE_META: Record<string, { label: string; bg: string; text: string; band: string }> = {
  vacation:    { label: 'Vacation',     bg: 'oklch(0.93 0.05 240)', text: 'oklch(0.38 0.12 240)', band: 'oklch(0.88 0.06 240)' },
  holiday:     { label: 'Holiday',      bg: 'oklch(0.93 0.05 300)', text: 'oklch(0.38 0.12 300)', band: 'oklch(0.88 0.06 300)' },
  busy:        { label: 'Busy',         bg: 'oklch(0.95 0.07 75)',  text: 'oklch(0.42 0.12 75)',  band: 'oklch(0.93 0.06 75)'  },
  sale_window: { label: 'Sale Window',  bg: 'oklch(0.93 0.05 155)', text: 'oklch(0.38 0.12 155)', band: 'oklch(0.88 0.06 155)' },
  other:       { label: 'Other',        bg: 'oklch(0.95 0.00 0)',   text: 'oklch(0.45 0.00 0)',   band: 'oklch(0.92 0.00 0)'   },
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function toLocalDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function buildGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const last  = new Date(year, month + 1, 0)
  const grid: Date[] = []
  for (let i = 0; i < first.getDay(); i++) {
    grid.push(new Date(year, month, -first.getDay() + i + 1))
  }
  for (let d = 1; d <= last.getDate(); d++) grid.push(new Date(year, month, d))
  while (grid.length % 7 !== 0) {
    const last = grid[grid.length - 1]
    grid.push(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1))
  }
  return grid
}

type Props = {
  initialEvents: CalendarEvent[]
  timelineEvents: TimelineEvent[]
}

type PanelState =
  | { mode: 'closed' }
  | { mode: 'new'; date: string }
  | { mode: 'edit'; event: CalendarEvent }

export function CalendarTab({ initialEvents, timelineEvents }: Props) {
  const now    = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents)
  const [panel, setPanel]   = useState<PanelState>({ mode: 'closed' })

  // Form state
  const [fTitle,     setFTitle]     = useState('')
  const [fType,      setFType]      = useState<CalendarEvent['type']>('busy')
  const [fStartDate, setFStartDate] = useState('')
  const [fEndDate,   setFEndDate]   = useState('')
  const [fNotes,     setFNotes]     = useState('')
  const [saving,     setSaving]     = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  function openNew(date: string) {
    setFTitle(''); setFType('busy'); setFStartDate(date); setFEndDate(date); setFNotes('')
    setConfirmDel(false)
    setPanel({ mode: 'new', date })
    setTimeout(() => titleRef.current?.focus(), 50)
  }

  function openEdit(e: CalendarEvent) {
    setFTitle(e.title); setFType(e.type); setFStartDate(e.start_date); setFEndDate(e.end_date); setFNotes(e.notes ?? '')
    setConfirmDel(false)
    setPanel({ mode: 'edit', event: e })
    setTimeout(() => titleRef.current?.focus(), 50)
  }

  function closePanel() { setPanel({ mode: 'closed' }) }

  async function save() {
    if (!fTitle.trim()) return
    setSaving(true)
    try {
      if (panel.mode === 'new') {
        const res  = await fetch('/api/calendar-events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: fTitle.trim(), type: fType, start_date: fStartDate, end_date: fEndDate, notes: fNotes.trim() || null }),
        })
        const data = await res.json()
        setEvents(prev => [...prev, data].sort((a, b) => a.start_date.localeCompare(b.start_date)))
      } else if (panel.mode === 'edit') {
        const res  = await fetch(`/api/calendar-events/${panel.event.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: fTitle.trim(), type: fType, start_date: fStartDate, end_date: fEndDate, notes: fNotes.trim() || null }),
        })
        const data = await res.json()
        setEvents(prev => prev.map(e => e.id === data.id ? data : e).sort((a, b) => a.start_date.localeCompare(b.start_date)))
      }
      closePanel()
    } finally { setSaving(false) }
  }

  async function del() {
    if (panel.mode !== 'edit') return
    setSaving(true)
    try {
      await fetch(`/api/calendar-events/${panel.event.id}`, { method: 'DELETE' })
      setEvents(prev => prev.filter(e => e.id !== (panel as { mode: 'edit'; event: CalendarEvent }).event.id))
      closePanel()
    } finally { setSaving(false) }
  }

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const grid     = buildGrid(year, month)
  const todayIso = isoDate(now)
  const monthLabel = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // Index events by date for quick lookup
  function calEventsOnDay(dayIso: string): CalendarEvent[] {
    return events.filter(e => e.start_date <= dayIso && e.end_date >= dayIso)
  }
  function tlEventsOnDay(dayIso: string): TimelineEvent[] {
    return timelineEvents.filter(e => e.event_date === dayIso)
  }

  // Determine band rendering: start / mid / end
  function bandPosition(e: CalendarEvent, dayIso: string): 'start' | 'mid' | 'end' | 'single' {
    const sameDay = e.start_date === e.end_date
    if (sameDay) return 'single'
    if (dayIso === e.start_date) return 'start'
    if (dayIso === e.end_date)   return 'end'
    return 'mid'
  }

  const panelOpen = panel.mode !== 'closed'

  return (
    <div className="space-y-0 relative">

      {/* Month nav */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="text-lg font-display text-zinc-800 w-44 text-center">{monthLabel}</h2>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={() => openNew(todayIso)}
          className="text-sm font-medium text-white px-3 py-1.5 rounded-lg transition-colors"
          style={{ backgroundColor: SAGE }}>
          + Add event
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-xs font-semibold uppercase tracking-widest text-zinc-400 pb-2">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 border-l border-t border-zinc-100">
        {grid.map((day, i) => {
          const iso      = isoDate(day)
          const inMonth  = day.getMonth() === month
          const isToday  = iso === todayIso
          const calEvts  = calEventsOnDay(iso)
          const tlEvts   = tlEventsOnDay(iso)
          const hasEvents = calEvts.length > 0 || tlEvts.length > 0

          return (
            <div
              key={i}
              onClick={() => inMonth && openNew(iso)}
              className={`min-h-[90px] border-r border-b border-zinc-100 p-1.5 flex flex-col cursor-pointer transition-colors ${
                inMonth ? 'hover:bg-zinc-50' : 'bg-zinc-50/40'
              }`}
            >
              {/* Day number */}
              <div className="flex justify-end mb-1">
                <span className={`text-xs w-6 h-6 flex items-center justify-center rounded-full font-medium ${
                  isToday
                    ? 'text-white'
                    : inMonth ? 'text-zinc-600' : 'text-zinc-300'
                }`} style={isToday ? { backgroundColor: SAGE } : {}}>
                  {day.getDate()}
                </span>
              </div>

              {/* Events */}
              <div className="flex flex-col gap-0.5 flex-1">
                {calEvts.slice(0, 3).map(e => {
                  const meta = TYPE_META[e.type]
                  const pos  = bandPosition(e, iso)
                  const isMultiDay = e.start_date !== e.end_date
                  return (
                    <div
                      key={e.id}
                      onClick={ev => { ev.stopPropagation(); openEdit(e) }}
                      className="text-[10px] font-medium leading-tight px-1.5 py-0.5 truncate cursor-pointer"
                      style={{
                        backgroundColor: meta.band,
                        color: meta.text,
                        borderRadius: isMultiDay
                          ? pos === 'start' ? '4px 0 0 4px'
                          : pos === 'end'   ? '0 4px 4px 0'
                          : pos === 'mid'   ? '0'
                          : '4px'
                          : '4px',
                        marginLeft:  (isMultiDay && (pos === 'mid' || pos === 'end'))  ? '-6px' : undefined,
                        marginRight: (isMultiDay && (pos === 'mid' || pos === 'start')) ? '-6px' : undefined,
                      }}
                    >
                      {(pos === 'start' || pos === 'single') ? e.title : '\u00a0'}
                    </div>
                  )
                })}
                {tlEvts.slice(0, 2).map(e => (
                  <div key={e.id}
                    className="text-[10px] font-medium leading-tight px-1.5 py-0.5 truncate rounded"
                    style={{ backgroundColor: 'oklch(0.93 0.04 155)', color: SAGE }}>
                    {e.title}
                  </div>
                ))}
                {(calEvts.length + tlEvts.length) > 3 && (
                  <p className="text-[10px] text-zinc-400 px-1">+{calEvts.length + tlEvts.length - 3} more</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 pt-4 pb-1">
        {Object.entries(TYPE_META).map(([type, meta]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: meta.band }} />
            <span className="text-xs text-zinc-500">{meta.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'oklch(0.93 0.04 155)' }} />
          <span className="text-xs text-zinc-500">Project event</span>
        </div>
      </div>

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 transition-opacity duration-200"
        style={{ opacity: panelOpen ? 1 : 0, pointerEvents: panelOpen ? 'auto' : 'none' }}
        onClick={closePanel}
      />

      {/* Event panel */}
      <div
        className="fixed inset-y-0 right-0 z-50 w-[400px] bg-white shadow-2xl flex flex-col"
        style={{ transform: panelOpen ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1)' }}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-zinc-100">
          <h2 className="font-display text-[22px] text-zinc-800">
            {panel.mode === 'new' ? 'New Event' : 'Edit Event'}
          </h2>
          <button onClick={closePanel} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Title</label>
            <input ref={titleRef} value={fTitle} onChange={e => setFTitle(e.target.value)}
              placeholder="e.g. Family vacation, Memorial Day…"
              className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-200" />
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(TYPE_META) as CalendarEvent['type'][]).map(t => {
                const meta = TYPE_META[t]
                const active = fType === t
                return (
                  <button key={t} onClick={() => setFType(t)}
                    className="py-2 rounded-lg text-xs font-medium border transition-colors"
                    style={active
                      ? { backgroundColor: meta.bg, borderColor: meta.text, color: meta.text }
                      : { backgroundColor: 'white', borderColor: '#e4e4e7', color: '#71717a' }}>
                    {meta.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Start</label>
              <input type="date" value={fStartDate} onChange={e => { setFStartDate(e.target.value); if (e.target.value > fEndDate) setFEndDate(e.target.value) }}
                className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-200" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">End</label>
              <input type="date" value={fEndDate} min={fStartDate} onChange={e => setFEndDate(e.target.value)}
                className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-200" />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Notes</label>
            <textarea value={fNotes} onChange={e => setFNotes(e.target.value)}
              placeholder="Anything to note about this period…" rows={3}
              className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-200 resize-none" />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-zinc-100 flex items-center justify-between gap-3">
          <div>
            {panel.mode === 'edit' && !confirmDel && (
              <button onClick={() => setConfirmDel(true)} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-red-500 transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            )}
            {confirmDel && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">Delete this?</span>
                <button onClick={del} disabled={saving} className="text-xs text-red-600 font-medium hover:text-red-700 disabled:opacity-50">
                  {saving ? 'Deleting…' : 'Yes, delete'}
                </button>
                <button onClick={() => setConfirmDel(false)} className="text-xs text-zinc-400 hover:text-zinc-600">Cancel</button>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={closePanel} className="px-4 py-2 rounded-lg text-sm text-zinc-600 border border-zinc-200 hover:bg-zinc-50 transition-colors">Cancel</button>
            <button onClick={save} disabled={saving || !fTitle.trim()}
              className="px-4 py-2 rounded-lg text-sm text-white font-medium transition-colors disabled:opacity-40"
              style={{ backgroundColor: SAGE }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
