'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Layers } from 'lucide-react'
import {
  PLOTS, PLANT_DETAILS, GANTT_DATA, GANTT_STAGES,
  STATUS_CYCLE, STATUS_LABELS, CONF_LABELS,
  MONTHS, MONTH_STARTS, todayDOY, isPurchaseTask,
  buildSowSystemPrompt, defaultData,
  type GardenData, type PlotStatus, type PlantType, type Task, type GanttRow,
} from './lib/garden-constants'

// ─── Colour tokens ────────────────────────────────────────────────────────────
const C = {
  soil:    '#1C120A',
  bark:    '#3D2B1A',
  earth:   '#5C3D22',
  leaf:    '#2D4A1E',
  sprout:  '#4A7A2E',
  sage:    '#7A9E5C',
  harvest: '#C4943A',
  gold:    '#E8C068',
  cream:   '#F4EFE4',
  fog:     '#EAE3D6',
  mist:    '#D4C9B2',
  stone:   '#A89880',
  ink:     '#1A1208',
  white:   '#FDFAF5',
}

const THEME_OPTIONS = [
  { key: 'tomato',   label: 'Tomato',    bg: '#FDF0EC', border: '#E8C0B0' },
  { key: 'pepper',   label: 'Pepper',    bg: '#FDF5EC', border: '#E8D0A0' },
  { key: 'cucumber', label: 'Cucumber',  bg: '#EEF6EC', border: '#AACCA0' },
  { key: 'carrot',   label: 'Carrot',    bg: '#FEF5E8', border: '#E8C878' },
  { key: 'lettuce',  label: 'Lettuce',   bg: '#EAF4F8', border: '#9ACCD8' },
  { key: 'corn',     label: 'Corn',      bg: '#FDFAEC', border: '#D8C878' },
  { key: 'seasonal', label: 'General',   bg: '#EDF8F2', border: '#A0CCAC' },
  { key: 'garden',   label: 'Neutral',   bg: C.fog,     border: C.mist    },
]

type Tab = 'tasks' | 'garden' | 'timeline' | 'shopping'

// ─── Window width hook ────────────────────────────────────────────────────────
function useWindowWidth() {
  const [width, setWidth] = useState(1200)
  useEffect(() => {
    setWidth(window.innerWidth)
    const handler = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return width
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SowPage() {
  const windowWidth                    = useWindowWidth()
  const isMobile                       = windowWidth < 640
  const [db, setDb]                    = useState<GardenData>(defaultData())
  const [loading, setLoading]          = useState(true)
  const [activeTab, setActiveTab]      = useState<Tab>('tasks')
  const [activePlot, setActivePlot]    = useState<string | null>(null)
  const [weather, setWeather]          = useState<{ temp: string; desc: string; context: string } | null>(null)

  useEffect(() => {
    fetch('/api/sow/garden-data')
      .then(r => r.json())
      .then(({ data }) => {
        if (data) setDb({ ...defaultData(), ...data })
        setLoading(false)
      })
      .catch(() => setLoading(false))
    loadWeather()
  }, [])

  const saveDB = useCallback(async (updated: GardenData) => {
    setDb(updated)
    await fetch('/api/sow/garden-data', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: updated }),
    })
  }, [])

  async function loadWeather() {
    try {
      const url = 'https://api.open-meteo.com/v1/forecast?latitude=40.3101&longitude=-75.1299&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=America%2FNew_York&forecast_days=7'
      const d = await fetch(url).then(r => r.json())
      const cw = d.current_weather
      const max = Math.round(d.daily.temperature_2m_max[0])
      const min = Math.round(d.daily.temperature_2m_min[0])
      const desc = wCode(cw.weathercode)
      const days = ['Today', 'Tomorrow', 'In 2 days', 'In 3 days', 'In 4 days', 'In 5 days', 'In 6 days']
      let ctx = '7-day Doylestown forecast:\n'
      for (let i = 0; i < 7; i++) {
        ctx += `${days[i]}: ${wCode(d.daily.weathercode[i])}, high ${Math.round(d.daily.temperature_2m_max[i])}F, precip ${d.daily.precipitation_sum[i].toFixed(2)}in\n`
      }
      setWeather({ temp: `${Math.round(cw.temperature)}°F`, desc: `${desc} · ${min}–${max}°F`, context: ctx })
    } catch { /* weather unavailable */ }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: C.cream }}>
        <p style={{ color: C.stone, fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Loading…</p>
      </div>
    )
  }

  return (
    <div style={{ background: C.cream, height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ background: C.bark, padding: isMobile ? '8px 14px' : '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <Link href="/lattice" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', marginBottom: 2, opacity: 0.7 }}>
            <Layers size={12} color={C.cream} />
            <span style={{ fontSize: '0.65rem', color: C.cream, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Lattice</span>
          </Link>
          <div style={{ fontFamily: "'Cormorant Garamond', 'Georgia', serif", fontSize: isMobile ? '1rem' : '1.2rem', color: C.cream, fontWeight: 400, letterSpacing: '0.04em', lineHeight: 1 }}>
            Durham Kitchen Garden
            {!isMobile && <span style={{ fontSize: '0.68rem', fontFamily: "'DM Sans', sans-serif", color: C.stone, letterSpacing: '0.1em', textTransform: 'uppercase', marginLeft: 6 }}>Bucks County, PA · Zone 6b</span>}
          </div>
        </div>
        {weather && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: isMobile ? '5px 10px' : '6px 12px', flexShrink: 0 }}>
            <span style={{ fontSize: '0.88rem', color: C.cream, fontWeight: 500 }}>{weather.temp}</span>
            {!isMobile && <span style={{ fontSize: '0.7rem', color: C.stone }}>{weather.desc}</span>}
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', background: C.soil, flexShrink: 0 }}>
        {(['tasks', 'garden', 'timeline', 'shopping'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1, padding: isMobile ? '10px 4px' : '11px 8px',
              fontSize: isMobile ? '0.62rem' : '0.7rem', letterSpacing: '0.08em',
              textTransform: 'uppercase', border: 'none', background: 'none', cursor: 'pointer',
              color: activeTab === tab ? C.gold : C.stone,
              borderBottom: `2px solid ${activeTab === tab ? C.gold : 'transparent'}`,
              transition: 'all 0.2s',
            }}
          >
            {tab === 'tasks' ? (isMobile ? 'Tasks' : 'This Week') : tab === 'garden' ? (isMobile ? 'Garden' : 'Garden Map') : tab === 'timeline' ? 'Timeline' : 'Shopping'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {activeTab === 'tasks'    && <TasksTab    db={db} saveDB={saveDB} weather={weather} setActivePlot={(p) => { setActivePlot(p); setActiveTab('garden') }} />}
        {activeTab === 'garden'   && <GardenTab   db={db} saveDB={saveDB} activePlot={activePlot} setActivePlot={setActivePlot} weather={weather} isMobile={isMobile} />}
        {activeTab === 'timeline' && <TimelineTab db={db} isMobile={isMobile} />}
        {activeTab === 'shopping' && <ShoppingTab db={db} saveDB={saveDB} />}
      </div>
    </div>
  )
}

// ─── Tasks Tab ────────────────────────────────────────────────────────────────

function TasksTab({ db, saveDB, weather, setActivePlot }: {
  db: GardenData
  saveDB: (d: GardenData) => Promise<void>
  weather: { temp: string; desc: string; context: string } | null
  setActivePlot: (id: string) => void
}) {
  const [generating, setGenerating] = useState(false)
  const [nudgeTask, setNudgeTask]   = useState<Task | null>(null)

  const now = new Date()
  const end = new Date(now); end.setDate(end.getDate() + 6)
  const dateRange = `${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`

  async function generateTasks() {
    setGenerating(true)
    const logSummary = Object.entries(db.logs || {})
      .flatMap(([plot, entries]) => entries.map(e => `${plot}: ${e.date} — ${e.text}`))
      .join('\n')
    const completed = (db.tasks || []).filter(t => t.done).map(t => t.text).join(', ')
    const endDate = new Date(); endDate.setDate(endDate.getDate() + 6)
    const prompt = `Generate garden tasks for the next 7 days (${now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} through ${endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}).
Weather: ${weather?.context || 'unavailable'}
Recently completed: ${completed || 'none'}
Activity log: ${logSummary || 'none yet'}
Return ONLY valid JSON (no markdown): {"tasks":[{"text":"...","tag":"...","urgent":true/false,"purchase":true/false}]}
Generate 8–20 specific actionable tasks. Rules: purchase:true only for buying/renting; each purchase task = one specific item; include paired seed/start purchase tasks for every sow/transplant task; if setup not confirmed include infrastructure tasks first.`

    try {
      const r = await fetch('/api/sow/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 2000,
          system: buildSowSystemPrompt(now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })),
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      const data = await r.json()
      const raw = data.content?.[0]?.text || '{}'
      const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
      const newTasks: Task[] = (parsed.tasks || []).map((t: Partial<Task>, i: number) => {
        const existing = (db.tasks || []).find(et => et.text === t.text)
        return { id: `task_${Date.now()}_${i}`, text: t.text || '', tag: t.tag || 'General', urgent: t.urgent || false, purchase: t.purchase || false, done: existing?.done || false }
      })
      await saveDB({ ...db, tasks: newTasks, tasksGenerated: new Date().toISOString() })
    } catch { /* generation failed */ }
    setGenerating(false)
  }

  async function toggleTask(id: string) {
    const updated = (db.tasks || []).map(t => t.id === id ? { ...t, done: !t.done } : t)
    const task = updated.find(t => t.id === id)
    await saveDB({ ...db, tasks: updated })
    if (task?.done && /\b(plant(?:ed|ing)?|sow(?:ed|ing)?|seed(?:ed|ing)?|transplant(?:ed|ing)?)\b/i.test(task.text)) {
      setNudgeTask(task)
      setTimeout(() => setNudgeTask(null), 12000)
    }
  }

  const tasks = db.tasks || []
  const pendingPurchaseTags = new Set(tasks.filter(t => isPurchaseTask(t) && !t.done).map(t => t.tag))
  const urgent = tasks.filter(t => t.urgent && !t.done)
  const normal = tasks.filter(t => !t.urgent && !t.done)
  const done   = tasks.filter(t => t.done)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', padding: 20, gap: 16 }}>
      {weather && (
        <div style={{ background: 'rgba(196,148,58,0.1)', border: '0.5px solid rgba(196,148,58,0.3)', borderRadius: 10, padding: '12px 14px', fontSize: '0.8rem', color: C.earth, lineHeight: 1.5 }}>
          {weather.context.split('\n').slice(0, 3).join(' · ')}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: "'Cormorant Garamond', 'Georgia', serif", fontSize: '1.4rem', color: C.ink }}>This Week&apos;s Tasks</div>
          <div style={{ fontSize: '0.75rem', color: C.stone }}>{dateRange}</div>
        </div>
        <button
          onClick={generateTasks}
          disabled={generating}
          style={{ background: C.leaf, color: C.sage, border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 14px', borderRadius: 20, cursor: 'pointer' }}
        >
          {generating ? '…' : '↻ Refresh'}
        </button>
      </div>

      {tasks.length === 0 && !generating && (
        <p style={{ color: C.stone, fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>No tasks yet — hit Refresh to generate this week&apos;s list.</p>
      )}

      {urgent.length > 0 && <TaskGroup label="Do now" tasks={urgent} pendingPurchaseTags={pendingPurchaseTags} onToggle={toggleTask} urgent />}
      {normal.length > 0 && <TaskGroup label="This week" tasks={normal} pendingPurchaseTags={pendingPurchaseTags} onToggle={toggleTask} />}
      {done.length   > 0 && <TaskGroup label="Completed" tasks={done}   pendingPurchaseTags={pendingPurchaseTags} onToggle={toggleTask} />}

      {nudgeTask && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: C.bark, border: '0.5px solid rgba(255,255,255,0.12)', color: C.cream, borderRadius: 14, padding: '12px 14px 12px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 6px 24px rgba(0,0,0,0.35)', zIndex: 600, maxWidth: 'min(420px,92vw)' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: C.gold, marginBottom: 3 }}>Planting milestone</div>
            <div style={{ fontSize: '0.8rem', color: C.cream, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nudgeTask.text}</div>
          </div>
          <button
            onClick={() => { const id = Object.keys(PLOTS).find(k => PLOTS[k].name.toLowerCase().includes((nudgeTask.tag || '').toLowerCase().split(' ')[0])) || 'garden'; setActivePlot(id) }}
            style={{ background: C.leaf, color: 'white', border: 'none', borderRadius: 20, padding: '6px 12px', fontSize: '0.72rem', cursor: 'pointer', flexShrink: 0 }}
          >
            Update timeline
          </button>
          <button onClick={() => setNudgeTask(null)} style={{ background: 'none', border: 'none', color: C.stone, fontSize: '1rem', cursor: 'pointer', padding: '2px 4px' }}>✕</button>
        </div>
      )}
    </div>
  )
}

function TaskGroup({ label, tasks, pendingPurchaseTags, onToggle, urgent }: {
  label: string
  tasks: Task[]
  pendingPurchaseTags: Set<string>
  onToggle: (id: string) => void
  urgent?: boolean
}) {
  return (
    <div>
      <div style={{ fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: C.stone, marginBottom: 10, paddingLeft: 6, borderLeft: `2px solid ${C.mist}` }}>{label}</div>
      {tasks.map(t => {
        const blocked = !t.done && !isPurchaseTask(t) && pendingPurchaseTags.has(t.tag)
        const ready   = !t.done && !isPurchaseTask(t) && !blocked
        return (
          <div
            key={t.id}
            onClick={() => onToggle(t.id)}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              background: C.white, border: `0.5px solid ${C.mist}`,
              borderLeft: t.done ? undefined : urgent && !t.done ? `3px solid ${C.harvest}` : blocked ? `3px solid ${C.harvest}` : ready ? '3px solid #5CAD40' : undefined,
              borderRadius: 10, padding: '12px 14px', marginBottom: 6, cursor: 'pointer',
              opacity: t.done ? 0.45 : 1,
            }}
          >
            <div style={{ width: 18, height: 18, borderRadius: '50%', border: `1.5px solid ${t.done ? C.sage : C.mist}`, flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.done ? C.sage : 'none' }}>
              {t.done && <span style={{ color: 'white', fontSize: 9, lineHeight: 1 }}>✓</span>}
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: C.ink, lineHeight: 1.5, textDecoration: t.done ? 'line-through' : 'none' }}>{t.text}</div>
              <div style={{ fontSize: '0.68rem', color: C.stone, marginTop: 3 }}>{t.tag}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Garden Tab ───────────────────────────────────────────────────────────────

function GardenTab({ db, saveDB, activePlot, setActivePlot, weather, isMobile }: {
  db: GardenData
  saveDB: (d: GardenData) => Promise<void>
  activePlot: string | null
  setActivePlot: (id: string | null) => void
  weather: { temp: string; desc: string; context: string } | null
  isMobile: boolean
}) {
  const dotClass = (plotId: string) => {
    const s = db.plotStatuses?.[plotId] || 'planning'
    return s === 'planning' ? '#AAB' : s === 'growing' ? C.sprout : s === 'harvest' ? C.harvest : C.stone
  }
  const confColor = (plotId: string) => {
    const l = db.plotConfidence?.[plotId]
    if (!l) return null
    return ['#4CAF50', '#8BC34A', '#D4A820', '#FF9800', '#E53935'][l - 1]
  }

  // Name and theme helpers that respect user overrides
  const pName  = (id: string, fallback: string) => db.plotLabels?.[id] || fallback
  const pTheme = (id: string, fallback: string) => db.plotThemes?.[id]  || fallback

  function PlotTile({ id, theme, style, name, flex }: { id: string; theme: string; style?: React.CSSProperties; name: string; flex?: number }) {
    const themes: Record<string, { bg: string; border: string; nameColor: string }> = {
      tomato:   { bg: '#FDF0EC', border: '#E8C0B0', nameColor: '#8B3A20' },
      pepper:   { bg: '#FDF5EC', border: '#E8D0A0', nameColor: '#8B5A10' },
      cucumber: { bg: '#EEF6EC', border: '#AACCA0', nameColor: '#2A5A20' },
      carrot:   { bg: '#FEF5E8', border: '#E8C878', nameColor: '#7A5010' },
      lettuce:  { bg: '#EAF4F8', border: '#9ACCD8', nameColor: '#1A5A70' },
      corn:     { bg: '#FDFAEC', border: '#D8C878', nameColor: '#5A4A10' },
      seasonal: { bg: '#EDF8F2', border: '#A0CCAC', nameColor: '#2A5A3A' },
      garden:   { bg: C.fog,    border: C.mist,    nameColor: C.earth   },
    }
    const t = themes[theme] || themes.garden
    const selected = activePlot === id
    return (
      <div
        onClick={() => setActivePlot(id)}
        style={{
          flex: flex ?? 1, border: `1.5px solid ${selected ? C.harvest : t.border}`,
          background: t.bg, cursor: 'pointer', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: '4px 3px',
          position: 'relative', overflow: 'hidden', boxSizing: 'border-box',
          boxShadow: selected ? `0 0 0 2px rgba(196,148,58,0.3)` : 'none',
          transition: 'all 0.2s', ...style,
        }}
      >
        <div style={{ position: 'absolute', top: 4, right: 4, width: 5, height: 5, borderRadius: '50%', background: dotClass(id) }} />
        {(() => { const cc = confColor(id); return cc ? <div style={{ position: 'absolute', bottom: 3, right: 4, width: 5, height: 5, borderRadius: '50%', background: cc }} /> : null })()}
        {db.plantTypes?.[id] && (
          <div style={{ position: 'absolute', top: 3, left: 3, fontSize: '0.38rem', fontWeight: 700, padding: '1px 3px', borderRadius: 2, lineHeight: 1.3, textTransform: 'uppercase', background: db.plantTypes[id] === 'seed' ? 'rgba(74,122,46,0.2)' : 'rgba(196,148,58,0.2)', color: db.plantTypes[id] === 'seed' ? '#3A6020' : '#8B6010' }}>
            {db.plantTypes[id] === 'seed' ? 'S' : 'T'}
          </div>
        )}
        <div style={{ fontSize: '0.54rem', fontWeight: 500, letterSpacing: '0.03em', textAlign: 'center', lineHeight: 1.2, color: t.nameColor }}>{name}</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
        <div style={{ display: 'inline-block', position: 'relative' }}>

          {/* Top labels */}
          <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 4, marginLeft: 20, marginRight: 36 }}>
            <div style={{ background: '#EDE9E4', border: '0.5px solid #C8C0B6', borderRadius: '5px 5px 0 0', padding: '4px 12px', fontSize: '0.58rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6B5E4E' }}>White Barn</div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 2, fontSize: '0.52rem', color: C.stone, letterSpacing: '0.06em' }}>Gate &amp; Entry ↗</div>
            <div style={{ background: '#F0E8E8', border: '0.5px solid #D8C0C0', borderRadius: '5px 5px 0 0', padding: '4px 12px', fontSize: '0.58rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7A3030' }}>Red Barn</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'row' }}>
            {/* West fence */}
            <div style={{ width: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'repeating-linear-gradient(0deg,#EBF4E8,#EBF4E8 5px,#BCDCB4 5px,#BCDCB4 7px)', border: '1.5px solid #7AAB70', borderRadius: '4px 0 0 4px', marginRight: 4, cursor: 'pointer' }}>
              <span style={{ fontSize: '0.4rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4A7040', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Deer Fence</span>
            </div>

            {/* Garden content */}
            <div style={{ display: 'flex', flexDirection: 'row' }}>
              {/* VEG SIDE */}
              <div style={{ display: 'flex', flexDirection: 'column', width: 360, flexShrink: 0 }}>
                {/* Row 1 Tomatoes 3ft */}
                <div style={{ display: 'flex', flexDirection: 'row', height: 60, width: 360 }}>
                  <PlotTile id="roma"       theme={pTheme('roma','tomato')}       flex={3} name={pName('roma','Roma')}                style={{ borderRadius: '4px 0 0 4px' }} />
                  <PlotTile id="sanmarzano" theme={pTheme('sanmarzano','tomato')} flex={1} name={pName('sanmarzano','San Marzano')}   style={{ borderLeft: 'none' }} />
                  <PlotTile id="sunrisebee" theme={pTheme('sunrisebee','tomato')} flex={1} name={pName('sunrisebee','Sunrise Bee')}   style={{ borderLeft: 'none' }} />
                  <PlotTile id="cherokee"   theme={pTheme('cherokee','tomato')}   flex={1} name={pName('cherokee','Cherokee Purple')} style={{ borderLeft: 'none' }} />
                  <PlotTile id="sweet100"   theme={pTheme('sweet100','tomato')}   flex={3} name={pName('sweet100','Sweet 100')}       style={{ borderLeft: 'none', borderRadius: '0 4px 4px 0' }} />
                </div>
                <PathRow label="1.5 ft path" />
                {/* Row 2 Peppers 1.5ft */}
                <div style={{ display: 'flex', flexDirection: 'row', height: 30, width: 360 }}>
                  {['pepperoncini','hungarianhot','chocolatebell','sweetbanana','orangeblaze','candycane','hotcherry'].map((id, i, arr) => (
                    <PlotTile key={id} id={id} theme={pTheme(id,'pepper')} flex={1} name={pName(id, PLOTS[id].name.split(' ')[0])}
                      style={{ borderRadius: i === 0 ? '4px 0 0 4px' : i === arr.length - 1 ? '0 4px 4px 0' : undefined, borderLeft: i > 0 ? 'none' : undefined }} />
                  ))}
                </div>
                <PathRow label="1.5 ft path" />
                {/* Row 3 Cucumbers 3ft */}
                <div style={{ display: 'flex', flexDirection: 'row', height: 60, width: 360 }}>
                  <PlotTile id="tastygreen"     theme={pTheme('tastygreen','cucumber')}     flex={4} name={pName('tastygreen','Tasty Green')}       style={{ borderRadius: '4px 0 0 4px' }} />
                  <PlotTile id="springburpless" theme={pTheme('springburpless','cucumber')} flex={4} name={pName('springburpless','Spring Burpless')} style={{ borderLeft: 'none' }} />
                  <PlotTile id="patiosnacker"   theme={pTheme('patiosnacker','cucumber')}   flex={2} name={pName('patiosnacker','Patio Snacker')}    style={{ borderLeft: 'none', borderRadius: '0 4px 4px 0' }} />
                </div>
                <PathRow label="1.5 ft path" />
                {/* Row 4 Carrots 1.5ft */}
                <div style={{ display: 'flex', flexDirection: 'row', height: 30, width: 360 }}>
                  <PlotTile id="scarletnantes" theme={pTheme('scarletnantes','carrot')} flex={2} name={pName('scarletnantes','Scarlet Nantes')} style={{ borderRadius: '4px 0 0 4px' }} />
                  <PlotTile id="rainbow"       theme={pTheme('rainbow','carrot')}       flex={2} name={pName('rainbow','Rainbow')}              style={{ borderLeft: 'none' }} />
                  <PlotTile id="genericcarrot" theme={pTheme('genericcarrot','carrot')} flex={1} name={pName('genericcarrot','Carrot')}          style={{ borderLeft: 'none', borderRadius: '0 4px 4px 0' }} />
                </div>
                <PathRow label="1.5 ft path" />
                {/* Row 5 Lettuce 3ft */}
                <div style={{ display: 'flex', flexDirection: 'row', height: 60, width: 360 }}>
                  <PlotTile id="burpeebibb"  theme={pTheme('burpeebibb','lettuce')}  flex={1} name={pName('burpeebibb','Burpee Bibb')}   style={{ borderRadius: '4px 0 0 4px' }} />
                  <PlotTile id="giantcaesar" theme={pTheme('giantcaesar','lettuce')} flex={1} name={pName('giantcaesar','Giant Caesar')} style={{ borderLeft: 'none' }} />
                  <PlotTile id="redromaine"  theme={pTheme('redromaine','lettuce')}  flex={1} name={pName('redromaine','Red Romaine')}   style={{ borderLeft: 'none', borderRadius: '0 4px 4px 0' }} />
                </div>
              </div>

              {/* Center path */}
              <div
                onClick={() => setActivePlot('garden')}
                style={{ width: 100, flexShrink: 0, background: 'repeating-linear-gradient(45deg,transparent,transparent 5px,rgba(0,0,0,0.02) 5px,rgba(0,0,0,0.02) 10px)', borderLeft: '0.5px dashed #DDD', borderRight: '0.5px dashed #DDD', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 360, cursor: 'pointer' }}
              >
                <span style={{ fontSize: '0.48rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#CCC', writingMode: 'vertical-rl' }}>5 ft path</span>
              </div>

              {/* CORN SIDE */}
              <div style={{ display: 'flex', flexDirection: 'row', flexShrink: 0, alignItems: 'flex-start' }}>
                {/* Mixed Veg col */}
                <div style={{ width: 60, height: 280, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 4, cursor: 'pointer' }}>
                  {['bokchoy','arugula','cantaloupe','poblano'].map((id, i, arr) => (
                    <PlotTile key={id} id={id} theme={pTheme(id,'seasonal')} flex={1} name={pName(id, PLOTS[id].name.split(' ')[0])}
                      style={{ borderRadius: i === 0 ? '4px 4px 0 0' : i === arr.length - 1 ? '0 0 4px 4px' : undefined, borderTop: i > 0 ? 'none' : undefined }} />
                  ))}
                </div>
                <CornPath />
                <CornCol id="earlysunglow" name={pName('earlysunglow','Early Sunglow')} onClick={() => setActivePlot('earlysunglow')} selected={activePlot === 'earlysunglow'} />
                <CornPath />
                <div style={{ width: 60, height: 280, display: 'flex', flexDirection: 'column', borderRadius: 4, cursor: 'pointer', opacity: 0.78, background: '#FDFAEC', border: '1.5px solid #D8C878' }} onClick={() => setActivePlot('earlysunglow')}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.46rem', color: '#5A4A10', textAlign: 'center', padding: 4 }}>{pName('earlysunglow','Early Sunglow')}</div>
                </div>
                <CornPath />
                <CornCol id="silverqueen" name={pName('silverqueen','Silver Queen')} onClick={() => setActivePlot('silverqueen')} selected={activePlot === 'silverqueen'} />
                <CornPath />
                <div style={{ width: 60, height: 280, borderRadius: 4, cursor: 'pointer', opacity: 0.78, background: '#FDFAEC', border: '1.5px solid #D8C878', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setActivePlot('silverqueen')}>
                  <span style={{ fontSize: '0.46rem', color: '#5A4A10' }}>{pName('silverqueen','Silver Queen')}</span>
                </div>
                <CornPath />
                <div style={{ width: 60, height: 280, borderRadius: 4, cursor: 'pointer', opacity: 0.78, background: '#FDFAEC', border: '1.5px solid #D8C878', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setActivePlot('silverqueen')}>
                  <span style={{ fontSize: '0.46rem', color: '#5A4A10' }}>{pName('silverqueen','Silver Queen')}</span>
                </div>
              </div>

              {/* Red Barn east strip */}
              <div style={{ width: 32, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 4, background: '#F0E8E8', border: '0.5px solid #D8C0C0', borderRadius: '0 4px 4px 0' }}>
                <span style={{ fontSize: '0.46rem', writingMode: 'vertical-rl', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7A3030', fontWeight: 600 }}>Red Barn</span>
              </div>
            </div>
          </div>

          {/* South fence */}
          <div style={{ height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'repeating-linear-gradient(90deg,#EBF4E8,#EBF4E8 5px,#BCDCB4 5px,#BCDCB4 7px)', border: '1.5px solid #7AAB70', borderRadius: '0 0 4px 4px', marginTop: 4, marginLeft: 20, marginRight: 36, cursor: 'pointer' }}>
            <span style={{ fontSize: '0.42rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4A7040' }}>Deer Fence (South)</span>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0 0', fontSize: '0.52rem', color: C.stone, letterSpacing: '0.07em', textTransform: 'uppercase', marginLeft: 20, marginRight: 36 }}>
            <span>W · Deer Fence</span>
            <span>Durham Kitchen Garden · ~46 × 22 ft · Zone 6b · South-Facing</span>
            <span>E · Red Barn</span>
          </div>

          {/* Whole Garden button */}
          <div style={{ textAlign: 'center', padding: '8px 0 2px' }}>
            <button onClick={() => setActivePlot('garden')} style={{ background: 'none', border: `0.5px solid ${C.mist}`, borderRadius: 6, padding: '5px 18px', fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: C.stone, cursor: 'pointer' }}>
              Whole Garden Overview
            </button>
          </div>
        </div>
      </div>

      {/* Side Panel — inline on desktop, full-screen overlay on mobile */}
      {activePlot && (
        <PlotSidePanel
          plotId={activePlot}
          db={db}
          saveDB={saveDB}
          weather={weather}
          onClose={() => setActivePlot(null)}
          isMobile={isMobile}
        />
      )}
    </div>
  )
}

function PathRow({ label }: { label: string }) {
  return (
    <div style={{ height: 30, background: 'repeating-linear-gradient(45deg,transparent,transparent 4px,rgba(0,0,0,0.025) 4px,rgba(0,0,0,0.025) 8px)', borderTop: '0.5px dashed #E0E0E0', borderBottom: '0.5px dashed #E0E0E0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: '0.46rem', letterSpacing: '0.08em', color: '#CCC' }}>{label}</span>
    </div>
  )
}

function CornPath() {
  return <div style={{ width: 20, height: 280, background: 'repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(0,0,0,0.022) 3px,rgba(0,0,0,0.022) 6px)', borderLeft: '0.5px dashed #DDD', borderRight: '0.5px dashed #DDD' }} />
}

function CornCol({ id, name, onClick, selected }: { id: string; name: string; onClick: () => void; selected: boolean }) {
  return (
    <div
      onClick={onClick}
      style={{ width: 60, height: 280, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 4, cursor: 'pointer', background: '#FDFAEC', border: `1.5px solid ${selected ? C.harvest : '#D8C878'}`, boxShadow: selected ? `0 0 0 2px rgba(196,148,58,0.3)` : 'none', alignItems: 'center', justifyContent: 'center' }}
    >
      <div style={{ fontSize: '0.48rem', color: '#5A4A10', textAlign: 'center', padding: 4 }}>{name}</div>
    </div>
  )
}

// ─── Plot Side Panel ──────────────────────────────────────────────────────────

type PanelTab = 'ask' | 'details' | 'status' | 'tasks' | 'edit'

function PlotSidePanel({ plotId, db, saveDB, weather, onClose, isMobile }: {
  plotId: string
  db: GardenData
  saveDB: (d: GardenData) => Promise<void>
  weather: { context: string } | null
  onClose: () => void
  isMobile: boolean
}) {
  const [panelTab, setPanelTab]         = useState<PanelTab>('ask')
  const [chatHistory, setChatHistory]   = useState<{ role: string; content: string }[]>([])
  const [chatInput, setChatInput]       = useState('')
  const [chatLoading, setChatLoading]   = useState(false)
  const [logInput, setLogInput]         = useState('')
  const [editName, setEditName]         = useState('')
  const [editTheme, setEditTheme]       = useState('')
  const [editSaved, setEditSaved]       = useState(false)
  const chatEndRef                      = useRef<HTMLDivElement>(null)
  const fileInputRef                    = useRef<HTMLInputElement>(null)

  const plot = PLOTS[plotId]
  const displayName = db.plotLabels?.[plotId] || plot?.name || 'Garden'

  useEffect(() => {
    const history = db.panelChatHistory?.[plotId] || []
    setChatHistory(history.length ? history : [{ role: 'agent', content: `I'm here to help with your ${displayName}. What would you like to know?` }])
    setPanelTab('ask')
    setEditName(db.plotLabels?.[plotId] || '')
    setEditTheme(db.plotThemes?.[plotId] || '')
  }, [plotId])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory, chatLoading])

  async function sendChat() {
    if (chatLoading || !chatInput.trim()) return
    const text = chatInput.trim()
    setChatInput('')
    const userMsg = { role: 'user', content: text }
    const updated = [...chatHistory, userMsg]
    setChatHistory(updated)
    setChatLoading(true)

    const status     = db.plotStatuses?.[plotId] || 'planning'
    const confLevel  = db.plotConfidence?.[plotId]
    const confText   = confLevel ? ` Confidence: ${CONF_LABELS[confLevel]} (${confLevel}/5, where 1=thriving, 5=poor).` : ''
    const logEntries = (db.logs?.[plotId] || []).map(e => `${e.date}: ${e.text}`).join('\n')
    const tasksSummary = (db.tasks || []).filter(t => !t.done).map(t => `[${t.id}] ${t.text} (${t.tag}${t.urgent ? ' URGENT' : ''})`).join('\n')
    const plantNames = (db.timeline || GANTT_DATA).map(r => r.name).join(', ')

    const contextMsg = `You are helping with the specific plot: ${displayName}. Plot status: ${status}.${confText} Plot info: ${plot?.info || 'Custom planting'}. Activity log:\n${logEntries || 'none'}\nWeather:\n${weather?.context || 'unavailable'}\nCurrent tasks:\n${tasksSummary || 'none'}

IMPORTANT: For actionable requests, respond with ONLY JSON:
If user asks to create tasks: {"action":"create_tasks","message":"confirmation","tasks":[{"text":"...","tag":"${displayName}","urgent":true/false,"purchase":true/false}]}
If user asks what to buy: {"action":"flag_purchases","message":"confirmation","taskIds":["id1"],"newTasks":[{"text":"Buy ...","tag":"${displayName}","urgent":false,"purchase":true}]}
If user asks to adjust timeline: {"action":"update_timeline","message":"confirmation","updates":[{"name":"exact plant name","sow":doy,"grow":doy,"harvest":doy,"end":doy}]}
Day-of-year: Apr 1=91, May 1=121, Jun 1=152, Jul 1=182, Aug 1=213, Sep 1=244, Oct 1=274. Valid plant names: ${plantNames}
For all other questions, respond in plain prose.`

    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    try {
      const r = await fetch('/api/sow/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 600,
          system: buildSowSystemPrompt(today),
          messages: [
            ...chatHistory.filter(m => m.role === 'user' || m.role === 'assistant').slice(-6),
            { role: 'user', content: contextMsg + '\n\nUser message: ' + text },
          ],
        }),
      })
      const data = await r.json()
      let reply = data.content?.[0]?.text || 'Sorry, try again.'

      try {
        const trimmed = reply.trim()
        if (trimmed.startsWith('{') || trimmed.startsWith('```')) {
          const parsed = JSON.parse(trimmed.replace(/```json|```/g, '').trim())
          if (parsed.action === 'create_tasks' && Array.isArray(parsed.tasks)) {
            const newTasks: Task[] = parsed.tasks.map((t: Partial<Task>, i: number) => ({ id: `task_${Date.now()}_${i}`, text: t.text || '', tag: t.tag || displayName || 'General', urgent: t.urgent || false, purchase: t.purchase || false, done: false }))
            const existing = db.tasks || []
            const toAdd = newTasks.filter(nt => !existing.find(et => et.text === nt.text))
            await saveDB({ ...db, tasks: [...existing, ...toAdd] })
            reply = parsed.message || `Added ${toAdd.length} task${toAdd.length !== 1 ? 's' : ''} to your list.`
          } else if (parsed.action === 'flag_purchases') {
            const updatedTasks = (db.tasks || []).map(t => (parsed.taskIds || []).includes(t.id) ? { ...t, purchase: true } : t)
            const toAdd: Task[] = (parsed.newTasks || []).filter((nt: Partial<Task>) => !updatedTasks.find(et => et.text === nt.text)).map((t: Partial<Task>, i: number) => ({ id: `task_${Date.now()}_${i}`, text: t.text || '', tag: t.tag || displayName || 'General', urgent: t.urgent || false, purchase: true, done: false }))
            await saveDB({ ...db, tasks: [...updatedTasks, ...toAdd] })
            reply = parsed.message || 'Shopping list updated.'
          } else if (parsed.action === 'update_timeline') {
            const base: GanttRow[] = JSON.parse(JSON.stringify(db.timeline || GANTT_DATA))
            ;(parsed.updates || []).forEach((upd: Partial<GanttRow>) => {
              const row = base.find(r => r.name === upd.name)
              if (row) { if (upd.sow !== undefined) row.sow = upd.sow; if (upd.grow !== undefined) row.grow = upd.grow; if (upd.harvest !== undefined) row.harvest = upd.harvest; if (upd.end !== undefined) row.end = upd.end }
            })
            await saveDB({ ...db, timeline: base })
            reply = parsed.message || 'Timeline updated.'
          }
        }
      } catch { /* plain prose */ }

      const newHistory = [...updated, { role: 'assistant', content: reply }]
      setChatHistory(newHistory)
      const persisted = newHistory.filter(m => m.role === 'user' || m.role === 'assistant').slice(-10)
      await saveDB({ ...db, panelChatHistory: { ...db.panelChatHistory, [plotId]: persisted } })
    } catch {
      setChatHistory([...updated, { role: 'agent', content: 'Connection error. Please try again.' }])
    }
    setChatLoading(false)
  }

  async function addLog() {
    const text = logInput.trim()
    if (!text) return
    setLogInput('')
    const now = new Date()
    const date = `${now.getMonth() + 1}/${now.getDate()}`
    const entries = [...(db.logs?.[plotId] || []), { date, text }]
    await saveDB({ ...db, logs: { ...db.logs, [plotId]: entries } })
  }

  async function cycleStatus() {
    const curr = db.plotStatuses?.[plotId] || 'planning'
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(curr) + 1) % STATUS_CYCLE.length]
    await saveDB({ ...db, plotStatuses: { ...db.plotStatuses, [plotId]: next } })
  }

  async function setConfidence(level: number) {
    await saveDB({ ...db, plotConfidence: { ...db.plotConfidence, [plotId]: level } })
  }

  async function setPlantType(type: PlantType) {
    await saveDB({ ...db, plantTypes: { ...db.plantTypes, [plotId]: type } })
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const images = db.plotImages?.[plotId] || []
    if (images.length >= 4) return
    const data = await compressImage(file)
    const title = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
    const updated = [...images, { id: `img_${Date.now()}`, title, data }]
    await saveDB({ ...db, plotImages: { ...db.plotImages, [plotId]: updated } })
  }

  async function deleteImage(imgId: string) {
    const updated = (db.plotImages?.[plotId] || []).filter(i => i.id !== imgId)
    await saveDB({ ...db, plotImages: { ...db.plotImages, [plotId]: updated } })
  }

  async function saveEdit() {
    const newLabels = { ...(db.plotLabels || {}) }
    if (editName.trim()) newLabels[plotId] = editName.trim()
    else delete newLabels[plotId]
    const newThemes = { ...(db.plotThemes || {}) }
    if (editTheme) newThemes[plotId] = editTheme
    else delete newThemes[plotId]
    await saveDB({ ...db, plotLabels: newLabels, plotThemes: newThemes })
    setEditSaved(true)
    setTimeout(() => setEditSaved(false), 2000)
  }

  async function resetEdit() {
    const newLabels = { ...(db.plotLabels || {}) }
    delete newLabels[plotId]
    const newThemes = { ...(db.plotThemes || {}) }
    delete newThemes[plotId]
    setEditName('')
    setEditTheme('')
    await saveDB({ ...db, plotLabels: newLabels, plotThemes: newThemes })
  }

  const status    = db.plotStatuses?.[plotId] || 'planning'
  const confLevel = db.plotConfidence?.[plotId] || null
  const images    = db.plotImages?.[plotId] || []
  const logs      = (db.logs?.[plotId] || []).slice().reverse()
  const plantType = db.plantTypes?.[plotId] || null
  const detail    = PLANT_DETAILS[plotId]
  const plotTasks = (db.tasks || []).filter(t => {
    const tag = t.tag.toLowerCase()
    const n   = (displayName || '').toLowerCase().split(' ')[0]
    return tag.includes(n) || tag === 'general' || plotId === 'garden'
  })

  const statusColors: Record<string, { bg: string; color: string }> = {
    planning: { bg: '#EEEEF8', color: '#6060A0' },
    growing:  { bg: '#EEF6EE', color: C.leaf },
    harvest:  { bg: '#FEF6E8', color: C.earth },
    done:     { bg: '#EEEEF8', color: '#6060A0' },
  }
  const sc = statusColors[status] || statusColors.planning
  const confColors = ['#4CAF50', '#8BC34A', '#D4A820', '#FF9800', '#E53935']

  const panelStyle: React.CSSProperties = isMobile
    ? { position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', background: C.white, overflowY: 'hidden' }
    : { width: 360, borderLeft: `0.5px solid ${C.mist}`, display: 'flex', flexDirection: 'column', background: C.white, boxShadow: '-4px 0 20px rgba(0,0,0,0.08)', flexShrink: 0, overflowY: 'hidden' }

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={{ padding: '16px 18px 12px', borderBottom: `0.5px solid ${C.fog}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontFamily: "'Cormorant Garamond', 'Georgia', serif", fontSize: '1.2rem', color: C.ink, fontWeight: 400 }}>{displayName}</div>
          {db.plotLabels?.[plotId] && plot?.name && (
            <div style={{ fontSize: '0.65rem', color: C.stone, marginTop: 1 }}>was: {plot.name}</div>
          )}
          <div style={{ fontSize: '0.72rem', color: C.stone, marginTop: 2 }}>Doylestown, PA · Zone 6b</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', color: C.stone, cursor: 'pointer', padding: 4 }}>✕</button>
      </div>

      {/* Status row */}
      <div style={{ padding: '10px 18px', borderBottom: `0.5px solid ${C.fog}`, display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: '0.68rem', padding: '4px 10px', borderRadius: 10, fontWeight: 500, background: sc.bg, color: sc.color }}>{STATUS_LABELS[status as PlotStatus]}</span>
        <button onClick={cycleStatus} style={{ fontSize: '0.68rem', color: C.stone, background: 'none', border: `0.5px solid ${C.mist}`, borderRadius: 10, padding: '3px 8px', cursor: 'pointer' }}>Change status</button>
      </div>

      {/* Panel tabs */}
      <div style={{ display: 'flex', borderBottom: `0.5px solid ${C.fog}`, flexShrink: 0 }}>
        {(['ask', 'details', 'status', 'tasks', 'edit'] as PanelTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setPanelTab(tab)}
            style={{ flex: 1, padding: '9px 4px', textAlign: 'center', fontSize: '0.62rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: panelTab === tab ? C.leaf : C.stone, background: 'none', border: 'none', borderBottom: `2px solid ${panelTab === tab ? C.leaf : 'transparent'}`, cursor: 'pointer' }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Panel body */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Ask tab */}
        {panelTab === 'ask' && (
          <>
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {chatHistory.map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
                  <div style={{ maxWidth: '85%', padding: '9px 13px', borderRadius: m.role === 'user' ? '12px 3px 12px 12px' : '3px 12px 12px 12px', fontSize: '0.8rem', lineHeight: 1.55, background: m.role === 'user' ? C.bark : C.fog, color: m.role === 'user' ? C.cream : C.ink }}>
                    {m.content.split('\n').map((line, j) => <span key={j}>{line}{j < m.content.split('\n').length - 1 && <br />}</span>)}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ padding: '10px 14px', background: C.fog, borderRadius: '3px 12px 12px 12px', display: 'flex', gap: 3 }}>
                    {[0, 1, 2].map(i => <span key={i} style={{ width: 6, height: 6, background: C.mist, borderRadius: '50%', display: 'inline-block', animation: `bounce 1.2s ${i * 0.2}s infinite` }} />)}
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div style={{ padding: '10px 18px', borderTop: `0.5px solid ${C.fog}`, display: 'flex', gap: 8, flexShrink: 0 }}>
              <textarea
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat() } }}
                placeholder={`Ask about ${displayName}…`}
                rows={1}
                style={{ flex: 1, border: `0.5px solid ${C.mist}`, borderRadius: 16, padding: '8px 14px', fontFamily: "'DM Sans', sans-serif", fontSize: '0.8rem', color: C.ink, background: C.fog, outline: 'none', resize: 'none', maxHeight: 80 }}
              />
              <button onClick={sendChat} style={{ background: C.leaf, color: 'white', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" width={14} height={14} fill="white"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z" /></svg>
              </button>
            </div>
          </>
        )}

        {/* Details tab */}
        {panelTab === 'details' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
            {detail ? (
              <>
                {detail.img && <img src={detail.img} alt={displayName} style={{ width: '100%', height: 168, objectFit: 'cover', borderRadius: 8, marginBottom: 12, display: 'block' }} loading="lazy" />}
                {[['Expected Yield', detail.yield], ['Taste & Flavor', detail.taste], ['What to Expect', detail.appearance]].map(([label, text]) => (
                  <div key={label} style={{ background: C.fog, borderRadius: 8, padding: '12px 14px', marginBottom: 10 }}>
                    <div style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: C.stone, marginBottom: 6 }}>{label}</div>
                    <div style={{ fontSize: '0.82rem', color: C.ink, lineHeight: 1.65 }}>{text}</div>
                  </div>
                ))}
              </>
            ) : (
              <p style={{ fontSize: '0.8rem', color: C.stone }}>No plant details available. Use the Edit tab to name this plot.</p>
            )}
          </div>
        )}

        {/* Status tab */}
        {panelTab === 'status' && (
          <>
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
              {/* Plant type */}
              <div style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: C.stone, marginBottom: 6 }}>Plant type</div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                {(['seed', 'transplant'] as PlantType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => setPlantType(type)}
                    style={{ flex: 1, padding: '6px 8px', borderRadius: 6, border: `1.5px solid ${plantType === type ? (type === 'seed' ? '#4A7A2E' : '#8B6010') : C.mist}`, background: plantType === type ? (type === 'seed' ? '#EEF5E8' : '#FEF5E6') : C.fog, fontSize: '0.72rem', fontWeight: 500, cursor: 'pointer', color: plantType === type ? (type === 'seed' ? '#2A5A1E' : '#6B4A08') : C.stone }}
                  >
                    {type === 'seed' ? 'Seed (direct sow)' : 'Transplant / start'}
                  </button>
                ))}
              </div>

              {/* Confidence */}
              <div style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: C.stone, marginBottom: 6 }}>
                How is it going? {confLevel && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 4 }}>— {CONF_LABELS[confLevel]}</span>}
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                {[1, 2, 3, 4, 5].map(l => (
                  <button
                    key={l}
                    onClick={() => setConfidence(l)}
                    style={{ width: 34, height: 34, borderRadius: 8, border: `1.5px solid ${confColors[l - 1]}`, color: confLevel === l ? 'white' : confColors[l - 1], background: confLevel === l ? confColors[l - 1] : 'transparent', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {l}
                  </button>
                ))}
              </div>

              {/* Photos */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: C.stone }}>Photos</div>
                <button onClick={() => images.length < 4 && fileInputRef.current?.click()} disabled={images.length >= 4} style={{ fontSize: '0.68rem', color: C.stone, background: 'none', border: `0.5px solid ${C.mist}`, borderRadius: 10, padding: '3px 10px', cursor: 'pointer', opacity: images.length >= 4 ? 0.38 : 1 }}>+ Add Photo</button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
              {images.length === 0 ? (
                <p style={{ fontSize: '0.78rem', color: C.stone, textAlign: 'center', padding: '10px 0' }}>No photos yet</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                  {images.map(img => (
                    <div key={img.id} style={{ background: C.fog, borderRadius: 8, overflow: 'hidden' }}>
                      <img src={img.data} alt={img.title} style={{ width: '100%', height: 88, objectFit: 'cover', display: 'block' }} />
                      <div style={{ padding: '4px 6px 5px', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ flex: 1, fontSize: '0.7rem', color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{img.title}</span>
                        <button onClick={() => deleteImage(img.id)} style={{ background: 'none', border: 'none', color: C.mist, fontSize: '0.8rem', cursor: 'pointer', padding: '0 1px', lineHeight: 1 }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Activity log */}
              <div style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: C.stone, marginBottom: 8 }}>Activity log</div>
              {logs.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: C.stone, textAlign: 'center', padding: '1rem 0' }}>No entries yet</p>
              ) : logs.map((e, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: `0.5px solid ${C.fog}` }}>
                  <span style={{ fontSize: '0.68rem', color: C.stone, whiteSpace: 'nowrap', marginTop: 2, minWidth: 50 }}>{e.date}</span>
                  <span style={{ fontSize: '0.8rem', color: C.ink, lineHeight: 1.5, flex: 1 }}>{e.text}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: '10px 18px', borderTop: `0.5px solid ${C.fog}`, display: 'flex', gap: 8, flexShrink: 0 }}>
              <input
                value={logInput}
                onChange={e => setLogInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addLog()}
                placeholder="Log an activity…"
                style={{ flex: 1, border: `0.5px solid ${C.mist}`, borderRadius: 20, padding: '8px 14px', fontFamily: "'DM Sans', sans-serif", fontSize: '0.8rem', color: C.ink, background: C.fog, outline: 'none' }}
              />
              <button onClick={addLog} style={{ background: C.leaf, color: 'white', border: 'none', borderRadius: 20, padding: '8px 14px', fontSize: '0.75rem', cursor: 'pointer' }}>Log</button>
            </div>
          </>
        )}

        {/* Tasks tab */}
        {panelTab === 'tasks' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
            {plotTasks.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: C.stone, textAlign: 'center', padding: '1rem 0' }}>No tasks for this plot yet.<br />Refresh tasks on the main view.</p>
            ) : plotTasks.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: C.white, border: `0.5px solid ${C.mist}`, borderRadius: 10, padding: '12px 14px', marginBottom: 6, opacity: t.done ? 0.45 : 1 }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', border: `1.5px solid ${t.done ? C.sage : C.mist}`, flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.done ? C.sage : 'none' }}>
                  {t.done && <span style={{ color: 'white', fontSize: 9 }}>✓</span>}
                </div>
                <div style={{ fontSize: '0.85rem', color: C.ink, lineHeight: 1.5, textDecoration: t.done ? 'line-through' : 'none' }}>{t.text}</div>
              </div>
            ))}
          </div>
        )}

        {/* Edit tab */}
        {panelTab === 'edit' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
            <div style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: C.stone, marginBottom: 6 }}>Display name</div>
            <input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              placeholder={plot?.name || plotId}
              style={{ width: '100%', border: `0.5px solid ${C.mist}`, borderRadius: 8, padding: '9px 12px', fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem', color: C.ink, background: C.fog, outline: 'none', boxSizing: 'border-box', marginBottom: 16 }}
            />

            <div style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: C.stone, marginBottom: 8 }}>Color theme</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 20 }}>
              {THEME_OPTIONS.map(({ key, label, bg, border }) => (
                <button
                  key={key}
                  onClick={() => setEditTheme(editTheme === key ? '' : key)}
                  style={{
                    padding: '8px 4px', borderRadius: 8, border: `2px solid ${editTheme === key ? C.harvest : border}`,
                    background: bg, cursor: 'pointer', fontSize: '0.62rem', color: C.ink,
                    fontWeight: editTheme === key ? 600 : 400, transition: 'all 0.15s',
                    boxShadow: editTheme === key ? `0 0 0 2px rgba(196,148,58,0.25)` : 'none',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={resetEdit}
                style={{ flex: 1, padding: '9px 12px', borderRadius: 20, border: `0.5px solid ${C.mist}`, background: 'none', fontSize: '0.75rem', color: C.stone, cursor: 'pointer' }}
              >
                Reset to default
              </button>
              <button
                onClick={saveEdit}
                style={{ flex: 2, padding: '9px 12px', borderRadius: 20, border: 'none', background: editSaved ? C.sprout : C.leaf, color: 'white', fontSize: '0.75rem', cursor: 'pointer', transition: 'background 0.2s' }}
              >
                {editSaved ? '✓ Saved' : 'Save changes'}
              </button>
            </div>

            {plot?.name && (
              <p style={{ fontSize: '0.72rem', color: C.stone, marginTop: 16, lineHeight: 1.5 }}>
                Original: <em>{plot.name}</em>. Changes apply immediately to the garden map and are stored in your Lattice.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Timeline Tab ─────────────────────────────────────────────────────────────

function TimelineTab({ db, isMobile }: { db: GardenData; isMobile: boolean }) {
  const ganttData = db.timeline || GANTT_DATA
  const totalDays = 274 - 91
  const doy = todayDOY()
  const todayPct = ((doy - 91) / totalDays) * 100

  function dayToPct(d: number) {
    return Math.max(0, Math.min(100, ((d - 91) / totalDays) * 100))
  }

  const [tooltip, setTooltip] = useState<{ name: string; phase: string; desc: string; x: number; y: number } | null>(null)

  let lastGroup = ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', padding: 20 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: "'Cormorant Garamond', 'Georgia', serif", fontSize: '1.4rem', color: C.ink }}>Season Timeline</div>
        <div style={{ fontSize: '0.75rem', color: C.stone, marginTop: 3 }}>Doylestown PA · Zone 6b · Last frost Apr 15 – First frost Oct 15</div>
      </div>

      {/* Horizontally scrollable on mobile */}
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ minWidth: 600 }}>
          <div style={{ background: C.white, border: `0.5px solid ${C.mist}`, borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
            {/* Month headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '140px repeat(7,1fr)', borderBottom: `0.5px solid ${C.mist}` }}>
              <div style={{ fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: C.stone, padding: '8px 12px', borderRight: `0.5px solid ${C.mist}` }}>Plot</div>
              {MONTHS.map(m => <div key={m} style={{ textAlign: 'center', fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: C.stone, padding: '8px 4px', borderRight: `0.5px solid ${C.fog}` }}>{m}</div>)}
            </div>

            {/* Today line overlay */}
            {doy >= 91 && doy <= 274 && (
              <div style={{ position: 'absolute', top: 32, bottom: 40, left: `calc(${140 - todayPct * 1.4}px + ${todayPct}%)`, width: 2, background: 'rgba(196,148,58,0.85)', pointerEvents: 'none', zIndex: 10 }} />
            )}

            {ganttData.map((row, idx) => {
              const isNewGroup = row.group !== lastGroup
              if (isNewGroup) lastGroup = row.group
              const sowPct     = dayToPct(row.sow)
              const growPct    = dayToPct(row.grow)
              const harvestPct = dayToPct(row.harvest)
              const endPct     = dayToPct(row.end)

              return (
                <div key={idx}>
                  {isNewGroup && (
                    <div style={{ gridColumn: '1/-1', background: C.fog, padding: '5px 12px', fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: C.stone }}>{row.group}</div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '140px repeat(7,1fr)', borderBottom: `0.5px solid ${C.fog}`, minHeight: 36, alignItems: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: C.ink, padding: '0 12px', fontWeight: 500, borderRight: `0.5px solid ${C.mist}` }}>
                      {row.name}
                      <div style={{ fontSize: '0.62rem', color: C.stone }}>{row.sub}</div>
                    </div>
                    {MONTHS.map((_, mi) => {
                      const cellStart = dayToPct(MONTH_STARTS[mi])
                      const cellEnd   = mi < 6 ? dayToPct(MONTH_STARTS[mi + 1]) : 100
                      const cellW     = cellEnd - cellStart
                      const bars: { cls: string; start: number; end: number }[] = [
                        { cls: 'sow',     start: sowPct,     end: growPct    },
                        { cls: 'grow',    start: growPct,    end: harvestPct },
                        { cls: 'harvest', start: harvestPct, end: endPct     },
                      ]
                      return (
                        <div key={mi} style={{ borderRight: `0.5px solid ${C.fog}`, position: 'relative', height: 36 }}>
                          {bars.map(({ cls, start, end }) => {
                            const barStart = Math.max(0, start - cellStart)
                            const barEnd   = Math.min(cellW, end - cellStart)
                            const barW     = Math.max(0, barEnd - barStart)
                            if (barW <= 0) return null
                            const barColor = cls === 'sow' ? C.sage : cls === 'grow' ? C.sprout : C.harvest
                            return (
                              <div
                                key={cls}
                                onMouseEnter={isMobile ? undefined : e => {
                                  const stages = GANTT_STAGES[row.name]
                                  const desc = stages?.[cls as 'sow' | 'grow' | 'harvest'] || ''
                                  setTooltip({ name: row.name, phase: cls === 'sow' ? 'Sow / Transplant' : cls === 'grow' ? 'Growing' : 'Harvest', desc, x: e.clientX, y: e.clientY })
                                }}
                                onMouseLeave={isMobile ? undefined : () => setTooltip(null)}
                                style={{ position: 'absolute', top: 8, height: 20, borderRadius: 10, opacity: 0.85, background: barColor, left: `${(barStart / cellW) * 100}%`, width: `${(barW / cellW) * 100}%`, cursor: 'default' }}
                              />
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Legend */}
            <div style={{ display: 'flex', gap: 14, padding: '12px 16px', borderTop: `0.5px solid ${C.fog}`, flexWrap: 'wrap' }}>
              {[['Sow / transplant', C.sage], ['Growing', C.sprout], ['Harvest', C.harvest]].map(([label, color]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.7rem', color: C.stone }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip (desktop only) */}
      {tooltip && !isMobile && (
        <div style={{ position: 'fixed', left: tooltip.x + 14, top: tooltip.y - 80, background: C.soil, border: '0.5px solid rgba(255,255,255,0.1)', color: C.cream, borderRadius: 10, padding: '10px 13px', fontSize: '0.79rem', maxWidth: 230, pointerEvents: 'none', zIndex: 300, boxShadow: '0 4px 18px rgba(0,0,0,0.3)', lineHeight: 1.5 }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.sage, marginBottom: 2 }}>{tooltip.name}</div>
          <div style={{ fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: C.stone, marginBottom: 6 }}>{tooltip.phase}</div>
          <div>{tooltip.desc}</div>
        </div>
      )}
    </div>
  )
}

// ─── Shopping Tab ─────────────────────────────────────────────────────────────

function ShoppingTab({ db, saveDB }: { db: GardenData; saveDB: (d: GardenData) => Promise<void> }) {
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [pendingTaskId, setPendingTaskId]         = useState<string | null>(null)
  const [pmItem, setPmItem]   = useState('')
  const [pmCost, setPmCost]   = useState('')
  const [pmScope, setPmScope] = useState('garden')
  const [pmNotes, setPmNotes] = useState('')
  const [planningTrip, setPlanningTrip] = useState(false)
  const [tripPlan, setTripPlan]         = useState<string | null>(null)

  const tasks     = (db.tasks || []).filter(isPurchaseTask)
  const purchases = db.purchases || []
  const year      = new Date().getFullYear()
  const yearRecs  = purchases.filter(p => new Date(p.date).getFullYear() === year)
  const total     = yearRecs.reduce((s, p) => s + (p.cost || 0), 0)

  async function confirmPurchase() {
    if (!pmItem.trim()) return
    const purchase = { id: `p_${Date.now()}`, taskId: pendingTaskId || '', item: pmItem, cost: parseFloat(pmCost) || 0, scope: pmScope, notes: pmNotes, date: new Date().toISOString() }
    const updatedTasks = pendingTaskId ? (db.tasks || []).map(t => t.id === pendingTaskId ? { ...t, done: true } : t) : db.tasks || []
    await saveDB({ ...db, purchases: [...purchases, purchase], tasks: updatedTasks })
    setShowPurchaseModal(false); setPmItem(''); setPmCost(''); setPmScope('garden'); setPmNotes(''); setPendingTaskId(null)
  }

  async function planTrip() {
    setPlanningTrip(true)
    const buyNow = tasks.filter(t => !t.done && t.urgent).map(t => t.text).join('\n')
    const buyLater = tasks.filter(t => !t.done && !t.urgent).map(t => t.text).join('\n')
    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    try {
      const r = await fetch('/api/sow/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 450,
          system: buildSowSystemPrompt(today),
          messages: [{ role: 'user', content: `Plan a shopping trip for these garden purchases:\n\nUrgent (Buy Now):\n${buyNow || 'none'}\n\nBuy Later:\n${buyLater || 'none'}\n\nGroup items by store: Spring Valley Nurseries, Buckman's Home & Garden, Bucks Country Gardens, hardware store (Home Depot/Lowe's), or online. Suggest best order for the trip. Keep response concise and practical.` }],
        }),
      })
      const data = await r.json()
      setTripPlan(data.content?.[0]?.text || 'Could not plan trip.')
    } catch { setTripPlan('Connection error.') }
    setPlanningTrip(false)
  }

  const buyNow   = tasks.filter(t => !t.done && t.urgent)
  const buyLater = tasks.filter(t => !t.done && !t.urgent)
  const bought   = tasks.filter(t => t.done)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 0', flexShrink: 0 }}>
        <div>
          <div style={{ fontFamily: "'Cormorant Garamond', 'Georgia', serif", fontSize: '1.4rem', color: C.ink }}>Shopping List</div>
          <div style={{ fontSize: '0.75rem', color: C.stone }}>Supply purchases for your garden</div>
        </div>
        <button onClick={planTrip} disabled={planningTrip} style={{ background: C.leaf, color: C.sage, border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 14px', borderRadius: 20, cursor: 'pointer' }}>
          {planningTrip ? '…' : 'Plan Trip'}
        </button>
      </div>

      {total > 0 && (
        <div style={{ margin: '12px 20px 0', background: 'rgba(196,148,58,0.08)', border: '0.5px solid rgba(196,148,58,0.25)', borderRadius: 10, padding: '12px 16px' }}>
          <div style={{ fontSize: '0.85rem', color: C.earth }}>${total.toFixed(2)} spent in {year}</div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px 20px' }}>
        {tasks.length === 0 && <p style={{ fontSize: '0.85rem', color: C.stone, textAlign: 'center', padding: '2rem 0' }}>No purchase tasks yet. Generate tasks or ask the assistant to plan supplies.</p>}
        {buyNow.length   > 0 && <ShoppingGroup label="Buy Now"   tasks={buyNow}   onRecord={(id) => { setPendingTaskId(id); setShowPurchaseModal(true) }} />}
        {buyLater.length > 0 && <ShoppingGroup label="Buy Later" tasks={buyLater} onRecord={(id) => { setPendingTaskId(id); setShowPurchaseModal(true) }} />}
        {bought.length   > 0 && <ShoppingGroup label="Purchased" tasks={bought}   onRecord={() => {}} />}
      </div>

      {/* Trip plan modal */}
      {tripPlan && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setTripPlan(null)}>
          <div style={{ background: C.white, borderRadius: 16, padding: 24, width: 460, maxWidth: '90vw', boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: "'Cormorant Garamond', 'Georgia', serif", fontSize: '1.2rem', color: C.ink, marginBottom: 16 }}>Shopping Trip Plan</div>
            <div style={{ fontSize: '0.82rem', lineHeight: 1.7, color: C.ink }}>{tripPlan.split('\n').map((l, i) => <p key={i} style={{ marginBottom: 10 }}>{l}</p>)}</div>
            <button onClick={() => setTripPlan(null)} style={{ marginTop: 18, width: '100%', background: C.leaf, color: 'white', border: 'none', borderRadius: 20, padding: 10, fontSize: '0.8rem', cursor: 'pointer' }}>Done</button>
          </div>
        </div>
      )}

      {/* Purchase modal */}
      {showPurchaseModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowPurchaseModal(false)}>
          <div style={{ background: C.white, borderRadius: 16, padding: 24, width: 320, maxWidth: '90vw', boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: "'Cormorant Garamond', 'Georgia', serif", fontSize: '1.2rem', color: C.ink, marginBottom: 16 }}>Record Purchase</div>
            {[['Item purchased', pmItem, setPmItem, 'e.g. 3 tomato cages', 'text'], ['Cost ($)', pmCost, setPmCost, '0.00', 'number']].map(([label, val, setter, placeholder, type]) => (
              <div key={label as string} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: C.stone, marginBottom: 4, display: 'block' }}>{label as string}</label>
                <input value={val as string} onChange={e => (setter as (v: string) => void)(e.target.value)} type={type as string} placeholder={placeholder as string} style={{ width: '100%', border: `0.5px solid ${C.mist}`, borderRadius: 8, padding: '8px 12px', fontFamily: "'DM Sans', sans-serif", fontSize: '0.83rem', color: C.ink, background: C.fog, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: C.stone, marginBottom: 4, display: 'block' }}>Purchased for</label>
              <select value={pmScope} onChange={e => setPmScope(e.target.value)} style={{ width: '100%', border: `0.5px solid ${C.mist}`, borderRadius: 8, padding: '8px 12px', fontFamily: "'DM Sans', sans-serif", fontSize: '0.83rem', color: C.ink, background: C.fog, outline: 'none' }}>
                <option value="garden">Whole Garden</option>
                {Object.entries(PLOTS).filter(([k]) => k !== 'garden').map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: C.stone, marginBottom: 4, display: 'block' }}>Notes (optional)</label>
              <input value={pmNotes} onChange={e => setPmNotes(e.target.value)} placeholder="Store, brand, etc." style={{ width: '100%', border: `0.5px solid ${C.mist}`, borderRadius: 8, padding: '8px 12px', fontFamily: "'DM Sans', sans-serif", fontSize: '0.83rem', color: C.ink, background: C.fog, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => setShowPurchaseModal(false)} style={{ background: 'none', border: `0.5px solid ${C.mist}`, borderRadius: 20, padding: '10px 16px', fontSize: '0.8rem', cursor: 'pointer', color: C.stone }}>Cancel</button>
              <button onClick={confirmPurchase} style={{ flex: 1, background: C.leaf, color: 'white', border: 'none', borderRadius: 20, padding: 10, fontSize: '0.8rem', cursor: 'pointer' }}>Save Purchase</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ShoppingGroup({ label, tasks, onRecord }: { label: string; tasks: Task[]; onRecord: (id: string) => void }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: C.stone, marginBottom: 10, paddingLeft: 6, borderLeft: `2px solid ${C.mist}` }}>{label}</div>
      {tasks.map(t => (
        <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', background: C.white, border: `0.5px solid ${C.mist}`, borderRadius: 10, padding: '12px 14px', marginBottom: 6, opacity: t.done ? 0.5 : 1 }}>
          <div>
            <div style={{ fontSize: '0.85rem', color: C.ink, lineHeight: 1.5, textDecoration: t.done ? 'line-through' : 'none' }}>{t.text}</div>
            <div style={{ fontSize: '0.68rem', color: C.stone, marginTop: 3 }}>{t.tag}</div>
          </div>
          {!t.done && (
            <button onClick={() => onRecord(t.id)} style={{ background: 'none', border: `0.5px solid ${C.mist}`, borderRadius: 10, padding: '3px 10px', fontSize: '0.68rem', color: C.stone, cursor: 'pointer', flexShrink: 0, marginLeft: 8 }}>Bought</button>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function wCode(c: number) {
  if (c === 0) return 'Sunny'
  if (c <= 2) return 'Partly cloudy'
  if (c <= 3) return 'Overcast'
  if (c <= 67) return 'Rainy'
  if (c <= 77) return 'Snowy'
  if (c <= 82) return 'Showers'
  return 'Stormy'
}

function compressImage(file: File): Promise<string> {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, 800 / img.width)
        const canvas = document.createElement('canvas')
        canvas.width  = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.78))
      }
      img.src = e.target!.result as string
    }
    reader.readAsDataURL(file)
  })
}
