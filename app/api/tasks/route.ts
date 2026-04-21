import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getPropertyId } from '@/lib/get-property-id'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const propertyId = await getPropertyId(supabase, user.id)
  if (!propertyId) return NextResponse.json({ error: 'No property found' }, { status: 404 })

  const body = await req.json()
  const { project_id, title, description } = body
  if (!project_id || !title)
    return NextResponse.json({ error: 'project_id and title are required' }, { status: 400 })

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      property_id: propertyId,
      project_id,
      title,
      description: description ?? null,
      status: 'todo',
    })
    .select('id, title, status, due_date, description')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
