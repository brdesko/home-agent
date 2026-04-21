import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { fetchWithFirecrawl } from '@/lib/firecrawl'

export const runtime = 'edge'
export const maxDuration = 30

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

// Edge-compatible base64 encoder (no Buffer available in Edge runtime)
function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const chunks: string[] = []
  for (let i = 0; i < bytes.length; i += 0x8000) {
    chunks.push(String.fromCharCode(...bytes.subarray(i, i + 0x8000)))
  }
  return btoa(chunks.join(''))
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

export async function POST(req: NextRequest) {
  // Auth and validation happen before streaming starts
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { source, path, url, text } = body as {
    source: 'document' | 'url' | 'text'
    path?: string; url?: string; text?: string
  }

  const encoder = new TextEncoder()

  // Stream the response — heartbeat newlines keep the Vercel Edge connection alive
  // while Anthropic processes the document. Final JSON is the last line.
  const readable = new ReadableStream({
    async start(controller) {
      const hb   = () => controller.enqueue(encoder.encode('\n'))
      const end  = (result: unknown) => { controller.enqueue(encoder.encode(JSON.stringify(result) + '\n')); controller.close() }
      const fail = (msg: string)     => { controller.enqueue(encoder.encode(JSON.stringify({ error: msg }) + '\n')); controller.close() }

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let messages: any[]

        if (source === 'document' && path) {
          const fileName = path.split('/').pop() ?? ''
          const category = getMimeCategory(fileName)

          const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(path)
          if (dlErr || !blob) { fail(dlErr?.message ?? 'Download failed'); return }
          const arrayBuf = await blob.arrayBuffer()

          if (category === 'text') {
            const content = new TextDecoder().decode(arrayBuf).slice(0, 60000)
            messages = [{ role: 'user', content: `Document content:\n\n${content}\n\n${PARSE_PROMPT}` }]
          } else {
            const base64 = toBase64(arrayBuf)
            const mediaType = category === 'pdf' ? 'application/pdf'
              : blob.type || 'image/jpeg'
            const contentBlock = category === 'pdf'
              ? { type: 'document', source: { type: 'base64', media_type: mediaType, data: base64 } }
              : { type: 'image',    source: { type: 'base64', media_type: mediaType, data: base64 } }
            messages = [{ role: 'user', content: [contentBlock, { type: 'text', text: PARSE_PROMPT }] }]
          }

        } else if (source === 'url' && url) {
          const firecrawlText = await fetchWithFirecrawl(url)
          let pageText = ''
          if (firecrawlText) {
            pageText = firecrawlText.slice(0, 60000)
          } else if (ZILLOW_REDFIN.test(url)) {
            fail('Zillow and Redfin block automated access. Switch to "Paste text" mode: open the listing, press Ctrl+A then Ctrl+C, and paste the text here.')
            return
          } else {
            try {
              const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HomeAgent/1.0)' }, signal: AbortSignal.timeout(15000) })
              pageText = stripHtml(await res.text())
            } catch (e) { fail(`Could not fetch URL: ${String(e)}`); return }
          }
          messages = [{ role: 'user', content: `Webpage content from ${url}:\n\n${pageText}\n\n${PARSE_PROMPT}` }]

        } else if (source === 'text' && text) {
          messages = [{ role: 'user', content: `Property listing text:\n\n${text.slice(0, 60000)}\n\n${PARSE_PROMPT}` }]

        } else {
          fail('source must be "document" (with path), "url" (with url), or "text" (with text)')
          return
        }

        // Use raw fetch + SSE parsing — the Anthropic SDK uses Node.js internals that
        // fail silently in Edge runtime, producing empty text and "No structured data found"
        const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': process.env.ANTHROPIC_API_KEY!,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 8192, stream: true, messages }),
          signal: AbortSignal.timeout(28000),
        })

        if (!apiRes.ok) {
          const errText = await apiRes.text()
          fail(`Anthropic API error ${apiRes.status}: ${errText.slice(0, 300)}`)
          return
        }

        let raw = ''
        const reader = apiRes.body!.getReader()
        const decoder = new TextDecoder()
        let sseBuffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          sseBuffer += decoder.decode(value, { stream: true })
          const lines = sseBuffer.split('\n')
          sseBuffer = lines.pop() ?? ''
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue
            try {
              const evt = JSON.parse(data) as { type: string; delta?: { type: string; text?: string } }
              if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta' && evt.delta.text) {
                raw += evt.delta.text
                hb()
              }
            } catch { /* skip malformed SSE lines */ }
          }
        }

        if (!raw) {
          fail('No response text from Anthropic — the document may be too large, have too many pages, or contain only images. Try a smaller file or use the Paste text option instead.')
          return
        }
        end(extractJson(raw))

      } catch (e) {
        fail(`Parse failed: ${String(e)}`)
      }
    }
  })

  return new Response(readable, { headers: { 'Content-Type': 'application/x-ndjson' } })
}
