import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getPropertyId } from '@/lib/get-property-id'

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
    const lo   = Math.round(Math.min(...d.temps))
    const hi   = Math.round(Math.max(...d.temps))
    const mid  = d.conditions[Math.floor(d.conditions.length / 2)]
    const rain = Math.round(Math.max(...d.rain))
    return `${day}: ${lo}–${hi}°F, ${mid}, ${rain}% rain chance`
  }).join('\n')
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const PROPERTY_ID = await getPropertyId(supabase, user.id)
  if (!PROPERTY_ID) return NextResponse.json({ error: 'No property found' }, { status: 404 })

  // Fetch property details (including address for weather geocoding)
  const { data: propData } = await supabase
    .from('properties')
    .select('name, address, acreage, year_built, sq_footage, heat_type, well_septic, details_notes')
    .eq('id', PROPERTY_ID)
    .single()

  // Geocode the property address to get coordinates for weather
  let weatherSummary = 'Weather data unavailable.'
  let weatherError: string | null = null
  const key = process.env.OPENWEATHER_API_KEY

  if (!key) {
    weatherError = 'OPENWEATHER_API_KEY environment variable is not set'
  } else if (propData?.address) {
    try {
      const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(propData.address)}&limit=1&appid=${key}`
      const geoRes = await fetch(geoUrl, { cache: 'no-store' })
      if (geoRes.ok) {
        const geoData = await geoRes.json() as { lat: number; lon: number }[]
        if (geoData.length > 0) {
          const { lat, lon } = geoData[0]
          const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${key}&units=imperial&cnt=40`
          const forecastRes = await fetch(forecastUrl, { cache: 'no-store' })
          if (forecastRes.ok) {
            const json = await forecastRes.json()
            weatherSummary = summarizeForecast(json.list)
          } else {
            const body = await forecastRes.text()
            weatherError = `OpenWeatherMap forecast ${forecastRes.status}: ${body}`
            console.error('[suggestions] forecast fetch failed:', weatherError)
          }
        } else {
          weatherError = 'Could not geocode property address for weather lookup'
          console.error('[suggestions] geocoding returned no results for:', propData.address)
        }
      } else {
        const body = await geoRes.text()
        weatherError = `Geocoding ${geoRes.status}: ${body}`
        console.error('[suggestions] geocoding failed:', weatherError)
      }
    } catch (e) {
      weatherError = String(e)
      console.error('[suggestions] weather exception:', weatherError)
    }
  } else {
    weatherError = 'No property address on file — add one in Home Details for weather-aware suggestions'
  }

  const propertyContext = propData ? [
    propData.acreage       ? `${propData.acreage} acres`            : '',
    propData.year_built    ? `built ${propData.year_built}`         : '',
    propData.sq_footage    ? `${propData.sq_footage} sq ft`         : '',
    propData.heat_type     ? `${propData.heat_type} heat`           : '',
    propData.well_septic   ? `water/sewer: ${propData.well_septic}` : '',
    propData.details_notes ? propData.details_notes                 : '',
  ].filter(Boolean).join('; ') : ''

  // Fetch assets for maintenance context
  const { data: assetRows } = await supabase
    .from('assets')
    .select('name, asset_type, install_date, last_serviced_at, notes')
    .eq('property_id', PROPERTY_ID)
    .order('asset_type')

  const currentYear = new Date().getFullYear()
  const assetList = (assetRows ?? []).map(a => {
    const age     = a.install_date     ? `installed ${new Date(a.install_date).getFullYear()} (${currentYear - new Date(a.install_date).getFullYear()} yrs old)` : ''
    const service = a.last_serviced_at ? `last serviced ${new Date(a.last_serviced_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : 'no service record'
    const parts   = [a.asset_type, age, service, a.notes].filter(Boolean).join(', ')
    return `- ${a.name}: ${parts}`
  }).join('\n') || '(no assets recorded)'

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
    .map(t => {
      const p = Array.isArray(t.projects) ? t.projects[0] : t.projects
      return `- "${t.title}" (project: ${p?.name ?? 'unknown'}, domain: ${p?.domain ?? ''}, due: ${t.due_date ?? 'no date'})`
    })
    .join('\n') || '(no active tasks)'

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const propertyLabel = [propData?.name, propData?.address].filter(Boolean).join(' — ') || 'this property'

  const anthropic = new Anthropic()
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: `You are a property assistant for ${propertyLabel}.

Today is ${today}.
${propertyContext ? `\nProperty details: ${propertyContext}` : ''}

Property assets and systems:
${assetList}

5-day weather forecast:
${weatherSummary}

Active tasks:
${taskList}

Give exactly 3 short, specific, actionable suggestions. Draw from all available context: weather, asset ages and service records, property characteristics, and active tasks. Flag overdue maintenance on aging assets, weather-sensitive outdoor work, and anything that would be easy to miss. Be specific — name the asset or system when relevant. Write each as a single plain sentence on its own line. No bullets, no numbering, no headers.`,
    }],
  })

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text).join('').trim()

  const suggestions = text.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 3)

  return NextResponse.json({ suggestions, weatherSummary, weatherError })
}
