import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { fetchWithFirecrawl } from '@/lib/firecrawl'

export const maxDuration = 60

const BUCKET = 'Home Agent'

const ZILLOW_REDFIN = /zillow\.com|redfin\.com/i

const PARSE_PROMPT = `You are a property intelligence assistant. Extract structured information from the provided document or webpage.

Return ONLY valid JSON with no markdown formatting, matching this exact structure:
{
  "summary": "One sentence describing what this source is",
  "uncertain_fields": ["year_built"],
  "propertyDetails": [
    { "field": "year_built", "label": "Year Built", "value": "1985" }
  ],
  "assets": [
    { "name": "Carrier Gas Furnace", "assetType": "hvac", "make": "Carrier", "model": "58CVA080", "serialNumber": "", "installDate": "2015", "location": "Basement", "notes": "Good condition" }
  ],
  "suggestedProjects": [
    {
      "name": "Replace aging water heater",
      "domain": "maintenance",
      "description": "Water heater is 18 years old and showing corrosion at base.",
      "priority": "high",
      "tasks": [
        { "title": "Get quotes from 3 plumbers", "description": "" },
        { "title": "Choose replacement unit (tank vs tankless)", "description": "" },
        { "title": "Schedule installation", "description": "" }
      ]
    }
  ]
}

The "uncertain_fields" array should list the field names of any propertyDetails entries where you were not confident — e.g. if year_built was inferred rather than stated, include "year_built". Use an empty array [] if everything is clearly stated in the source.

Property detail fields (use these exact field names):
- year_built: year built (e.g. "1978")
- sq_footage: interior square footage (e.g. "2400")
- lot_size: land size as text (e.g. "5.3 acres")
- acreage: usable acreage as number string (e.g. "3.5")
- heat_type: primary heat fuel — oil, gas, propane, electric, heat pump, or wood
- well_septic: water source and sewer description
- details_notes: other notable facts worth remembering

Asset types (use exact values): hvac, water-heater, roof, well-pump, septic, electrical, plumbing, appliance, vehicle, equipment, structure, other

Project priorities: high, medium, low
Project domains: renovation, farm, grounds, maintenance, home-systems

For each suggested project, include 2–5 concrete starter tasks that would make meaningful progress. Tasks should be specific and actionable, not generic placeholders.

Include only items actually present in the source. Use empty arrays [] for categories with nothing found.`

function extractJson(raw: string): unknown {
  const empty = { summary: 'No structured data found.', uncertain_fields: [], propertyDetails: [], assets: [], suggestedProjects: [] }
  const cleaned = raw.trim()
  try { return JSON.parse(cleaned) } catch {}
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenced) try { return JSON.parse(fenced[1].trim()) } catch {}
  const braceStart = cleaned.indexOf('{')
  const braceEnd   = cleaned.lastIndexOf('}')
  if (braceStart !== -1 && braceEnd > braceStart) {
    try { return JSON.parse(cleaned.slice(braceStart, braceEnd + 1)) } catch {}
  }
  return empty
}

function getMimeCategory(name: string): 'pdf' | 'image' | 'text' {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf') return 'pdf'
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image'
  return 'text'
}

function getImageMime(name: string): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'png') return 'image/png'
  if (ext === 'gif') return 'image/gif'
  if (ext === 'webp') return 'image/webp'
  return 'image/jpeg'
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60000)
}

const MAX_PDF_BYTES = 10 * 1024 * 1024 // 10 MB

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { source, path, url, text } = body as { source: 'document' | 'url' | 'text'; path?: string; url?: string; text?: string }

    const anthropic = new Anthropic()
    let parseResult: unknown

    if (source === 'document' && path) {
      const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(path)
      if (dlErr || !blob) return NextResponse.json({ error: dlErr?.message ?? 'Download failed' }, { status: 500 })

      const buffer   = Buffer.from(await blob.arrayBuffer())
      const fileName = path.split('/').pop() ?? ''
      const category = getMimeCategory(fileName)

      if (buffer.byteLength > MAX_PDF_BYTES) {
        return NextResponse.json({
          error: `File is too large to parse (${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB). Maximum supported size is 10 MB.`
        }, { status: 422 })
      }

      const base64 = buffer.toString('base64')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let contentBlock: any

      if (category === 'pdf') {
        contentBlock = {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: base64 },
        }
      } else if (category === 'image') {
        contentBlock = {
          type: 'image',
          source: { type: 'base64', media_type: getImageMime(fileName), data: base64 },
        }
      } else {
        const textContent = buffer.toString('utf-8').slice(0, 60000)
        const msg = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 4096,
          messages: [{ role: 'user', content: `Document content:\n\n${textContent}\n\n${PARSE_PROMPT}` }],
        })
        const raw = msg.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map(b => b.text).join('')
        parseResult = extractJson(raw)
        return NextResponse.json(parseResult)
      }

      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        messages: [{ role: 'user', content: [contentBlock, { type: 'text', text: PARSE_PROMPT }] }],
      })
      const raw = msg.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map(b => b.text).join('')
      parseResult = extractJson(raw)

    } else if (source === 'url' && url) {
      let pageText = ''

      // Try Firecrawl first for JS-rendered sites (including Zillow/Redfin)
      const firecrawlText = await fetchWithFirecrawl(url)
      if (firecrawlText) {
        pageText = firecrawlText.slice(0, 60000)
      } else if (ZILLOW_REDFIN.test(url)) {
        return NextResponse.json({
          error: 'Zillow and Redfin block automated access. Switch to "Paste text" mode: open the listing, press Ctrl+A then Ctrl+C, and paste the text here.'
        }, { status: 422 })
      } else {
        try {
          const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HomeAgent/1.0)' },
            signal: AbortSignal.timeout(15000),
          })
          const html = await res.text()
          pageText = stripHtml(html)
        } catch (e) {
          return NextResponse.json({ error: `Could not fetch URL: ${String(e)}` }, { status: 422 })
        }
      }

      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        messages: [{ role: 'user', content: `Webpage content from ${url}:\n\n${pageText}\n\n${PARSE_PROMPT}` }],
      })
      const raw = msg.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map(b => b.text).join('')
      parseResult = extractJson(raw)

    } else if (source === 'text' && text) {
      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        messages: [{ role: 'user', content: `Property listing text:\n\n${text.slice(0, 60000)}\n\n${PARSE_PROMPT}` }],
      })
      const raw = msg.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map(b => b.text).join('')
      parseResult = extractJson(raw)

    } else {
      return NextResponse.json({ error: 'source must be "document" (with path), "url" (with url), or "text" (with text)' }, { status: 400 })
    }

    return NextResponse.json(parseResult)
  } catch (err) {
    console.error('[parse] unhandled error:', err)
    return NextResponse.json({ error: `Parse failed: ${String(err)}` }, { status: 500 })
  }
}
