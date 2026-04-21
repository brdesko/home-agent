import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getPropertyId } from '@/lib/get-property-id'

const anthropic = new Anthropic()

type QuarterlyBudgetSummary = {
  year: number
  quarter: number
  core_income: number
  additional_income: number
  core_expenses: number
  additional_expenses: number
  allocation_pct: number
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const propertyId = await getPropertyId(supabase, user.id)
  if (!propertyId) return NextResponse.json({ error: 'No property found' }, { status: 404 })

  const { quarterlyBudgets, messages } = await req.json() as {
    quarterlyBudgets: QuarterlyBudgetSummary[]
    messages: { role: 'user' | 'assistant'; content: string }[]
  }

  const budgetSummary = quarterlyBudgets.length > 0
    ? quarterlyBudgets.map(q => {
        const net = q.core_income + q.additional_income - q.core_expenses - q.additional_expenses
        const allocated = Math.round(net * q.allocation_pct) / 100
        return `Q${q.quarter} ${q.year}: income $${q.core_income + q.additional_income}, expenses $${q.core_expenses + q.additional_expenses}, allocation ${q.allocation_pct}%, available $${allocated}`
      }).join('\n')
    : 'No quarterly budgets set yet.'

  const systemPrompt = `You are a budget planning assistant for Parcel, a property management app for a 5.3-acre residential property in Pipersville, PA.

Help the owner fill in their quarterly financial budget. The budget has five fields per quarter:
- core_income: Regular predictable quarterly income (e.g. quarterly salary)
- additional_income: One-time or irregular income (bonuses, rental, etc.)
- core_expenses: Fixed recurring quarterly costs (mortgage × 3, utilities × 3, insurance, etc.)
- additional_expenses: Variable planned costs (travel, big purchases, etc.)
- allocation_pct: % of net income to direct toward home projects (typically 5–20%)

Available home project budget = (core_income + additional_income − core_expenses − additional_expenses) × allocation_pct / 100

Current data:
${budgetSummary}

Ask one or two questions at a time. Be conversational, not clinical. Start by asking about their income situation if nothing is set, or about what has changed if values exist.

When you have enough to suggest specific values, briefly explain your reasoning, then end your message with a suggestions block in exactly this format (nothing after the closing tag):

<suggestions>
{"2026-2": {"core_income": 25000, "core_expenses": 18000, "allocation_pct": 15}}
</suggestions>

Use the format "YEAR-QUARTER" as the key (e.g. "2026-2" for Q2 2026). Only include fields you have data for. Only suggest after at least one conversational exchange.`

  const convo: Anthropic.MessageParam[] = messages.length > 0
    ? messages.map(m => ({ role: m.role, content: m.content }))
    : [{ role: 'user', content: 'Help me set up my quarterly budget.' }]

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 700,
    system: systemPrompt,
    messages: convo,
  })

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')

  const match = text.match(/<suggestions>([\s\S]*?)<\/suggestions>/)
  let suggestions: Record<string, Record<string, number>> | null = null
  let message = text

  if (match) {
    try {
      suggestions = JSON.parse(match[1].trim())
      message = text.replace(/<suggestions>[\s\S]*?<\/suggestions>/, '').trim()
    } catch { /* leave suggestions null */ }
  }

  return NextResponse.json({ message, suggestions })
}
