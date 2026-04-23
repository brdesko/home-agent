export const ZILLOW_REDFIN = /zillow\.com|redfin\.com/i

export const LISTING_PARSE_PROMPT = `You are a property intelligence assistant. Extract structured information from the provided listing or document.

Return ONLY valid JSON with no markdown, matching this exact structure:
{
  "summary": "One sentence describing this property",
  "uncertain_fields": ["year_built"],
  "propertyDetails": {
    "year_built": 1985,
    "sq_footage": 2400,
    "lot_size": "5.3 acres",
    "acreage": 5.3,
    "heat_type": "oil",
    "well_septic": "Private well, 4-bedroom septic installed 2008",
    "details_notes": "Other notable facts"
  },
  "assets": [
    { "name": "Carrier Gas Furnace", "asset_type": "hvac", "make": "Carrier", "model": "58CVA080", "install_date": "2015", "location": "Basement", "notes": "Good condition" }
  ],
  "suggestedProjects": [
    {
      "name": "Replace aging water heater",
      "domain": "maintenance",
      "description": "Water heater is 18 years old and showing corrosion.",
      "priority": "high",
      "tasks": ["Get quotes from 3 plumbers", "Choose tank vs tankless", "Schedule installation"]
    }
  ]
}

The "uncertain_fields" array should list the propertyDetails field names you were not confident about — e.g. if year_built was inferred rather than clearly stated, include "year_built". Use [] if everything is clearly stated.

Use null for any propertyDetails fields not found. Include only assets and projects actually evidenced in the source. Asset types: hvac, water-heater, roof, well-pump, septic, electrical, plumbing, appliance, vehicle, equipment, structure, other. Project domains: renovation, farm, grounds, maintenance, home-systems. Project priorities: high, medium, low.`

export function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60000)
}

export function extractListingJson(raw: string): unknown {
  const cleaned = raw.trim()
  try { return JSON.parse(cleaned) } catch {}
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenced) try { return JSON.parse(fenced[1].trim()) } catch {}
  const braceStart = cleaned.indexOf('{')
  const braceEnd   = cleaned.lastIndexOf('}')
  if (braceStart !== -1 && braceEnd > braceStart) {
    try { return JSON.parse(cleaned.slice(braceStart, braceEnd + 1)) } catch {}
  }
  return null
}
