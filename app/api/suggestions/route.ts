import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const PROPERTY_ID = 'a1b2c3d4-0000-0000-0000-000000000001'
const LAT = 40.4537
const LON = -75.0657

type ForecastItem = {
  dt: number
  main: { temp: number }
  weather: { description: string }[]
  pop: number
}

function summarizeForecast(list: ForecastItem[]): string {
  const byDay: Record<string, { temps: number[]; conditions: string[]; rain: number[] }> = {}
  for (const item of list) {
    const day = new Date(item.dt * 1000).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    byDay[day] ??= { temps: [], conditions: [], rain: [] }
    byDay[day].temps.push(item.main.temp)
    byDay[day].conditions.push(item.weather[0].description)
    byDay[day].rain.push((item.pop ?? 0) * 100)
  }
  return Object.entries(byDay).slice(0, 5).map(([day, d]) => {
    const lo  = Math.round(Math.min(...d.temps))
    const hi  = Math.round(Math.max(...d.temps))
    const mid = d.conditions[Math.floor(d.conditions.length / 2)]
    const rain = Math.round(Math.max(...d.rain))
    return `${day}: ${lo}–${hi}°F, ${mid}, ${rain}% rain chance`
  }).join('\n')
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch weather (cache 1 hour)
  let weatherSummary = 'Weather data unavailable.'
  try {
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${LAT}&lon=${LON}&appid=${process.env.OPENWEATHER_API_KEY}&units=imperial&cnt=40`
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (res.ok) {
      const json = await res.json()
      weatherSummary = summarizeForecast(json.list)
    }
  } catch { /* leave default */ }

  // Fetch active tasks with project context
  const { data: taskRows } = await supabase
    .from('tasks')
    .select('title, status, due_date, projects(name, domain, effort)')
    .eq('property_id', PROPERTY_ID)
    .in('status', ['todo', 'in_progress'])
    .order('due_date', { nullsFirst: false })
    .limit(30)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const taskList = ((taskRows ?? []) as any[])
    .map((t: any) => {
      const p = Array.isArray(t.projects) ? t.projects[0] : t.projects
      return `- "${t.title}" (project: ${p?.name ?? 'unknown'}, domain: ${p?.domain ?? ''}, due: ${t.due_date ?? 'no date'})`
    })
    .join('\n') || '(no active tasks)'

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const anthropic = new Anthropic()
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `You are a property assistant for a 5.3-acre property in Pipersville, PA managed by Brady and Erin.

Today is ${today}.

5-day weather forecast:
${weatherSummary}

Active tasks:
${taskList}

Give exactly 2-3 short, specific, actionable suggestions that account for the weather forecast. Prioritize outdoor tasks that would be affected by rain or temperature. Write each as a single plain sentence on its own line. No bullets, no numbering, no headers.`,
    }],
  })

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text).join('').trim()

  const suggestions = text.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 3)

  return NextResponse.json({ suggestions, weatherSummary })
}
