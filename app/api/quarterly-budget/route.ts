import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getPropertyId } from '@/lib/get-property-id'

type ExpenseItem = { description: string; amount: number }

export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const propertyId = await getPropertyId(supabase, user.id)
  if (!propertyId) return NextResponse.json({ error: 'No property found' }, { status: 404 })

  const body = await req.json() as {
    year: number
    quarter: number
    core_income?: number
    additional_income?: number
    core_expenses?: number
    additional_expenses?: number
    additional_expense_items?: ExpenseItem[]
    allocation_pct?: number
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { year, quarter, id: _id, ...fields } = body as typeof body & { id?: string }

  const { data, error } = await supabase
    .from('quarterly_budget')
    .upsert(
      { property_id: propertyId, year, quarter, ...fields },
      { onConflict: 'property_id,year,quarter' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
