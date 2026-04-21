import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import pdfParse from 'pdf-parse'

// Node.js runtime — gives us pdf-parse and avoids the 30s Edge ceiling.
// Text extraction is milliseconds; Anthropic text-only calls complete in ~5–8s.
export const maxDuration = 60

const BUCKET = 'Home Agent'

const PARSE_PROMPT = `You are a property intelligence assistant. Extract structured information from the provided document.

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

The "uncertain_fields" array should list the field names of any propertyDetails entries where you were not confident. Use an empty array [] if everything is clearly stated.

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

For each suggested project, include 2–5 concrete starter tasks. Tasks should be specific and actionable.

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

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { path } = await req.json() as { path: string }
  if (!path) return NextResponse.json({ error: 'path is required' }, { status: 400 })

  // Download the file from Supabase storage
  const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(path)
  if (dlErr || !blob) return NextResponse.json({ error: dlErr?.message ?? 'Download failed' }, { status: 500 })

  const arrayBuf = await blob.arrayBuffer()
  const buffer   = Buffer.from(arrayBuf)

  // Extract text from PDF. Falls back to empty string for image-only PDFs.
  let docText = ''
  try {
    const parsed = await pdfParse(buffer)
    docText = parsed.text.trim()
  } catch {
    return NextResponse.json({ error: 'Could not read this PDF. It may be corrupted or password-protected.' }, { status: 422 })
  }

  if (!docText) {
    return NextResponse.json({
      error: 'This PDF contains no extractable text — it is likely a scanned document (images of pages). Try copying the text manually and using the Paste text option instead.',
    }, { status: 422 })
  }

  // Truncate to avoid token limits — 60k chars covers ~15k tokens of input
  const content = docText.slice(0, 60000)

  const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      messages: [{ role: 'user', content: `Document text:\n\n${content}\n\n${PARSE_PROMPT}` }],
    }),
  })

  if (!apiRes.ok) {
    const errText = await apiRes.text()
    return NextResponse.json({ error: `Anthropic API error ${apiRes.status}: ${errText.slice(0, 200)}` }, { status: 500 })
  }

  const result = await apiRes.json() as { content: { type: string; text: string }[] }
  const raw    = result.content.filter(b => b.type === 'text').map(b => b.text).join('')
  return NextResponse.json(extractJson(raw))
}
