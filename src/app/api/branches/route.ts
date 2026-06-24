import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  // const supabase = await createClient()
  const supabase = await createServiceClient()
  const { data, error } = await supabase.from('branches').select('*').order('name')
  // console.log('Branches GET data:', data)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const service = createServiceClient()
  const { data, error } = await service.from('branches').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing branch ID' }, { status: 400 })

  const body = await req.json()
  const { name, address } = body
  const service = createServiceClient()

  const { data, error } = await service
    .from('branches')
    .update({ name, address })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing branch ID' }, { status: 400 })

  const service = createServiceClient()
  
  const { count, error: countError } = await service
    .from('employees')
    .select('id', { count: 'exact', head: true })
    .eq('branch_id', id)

  if (countError) return NextResponse.json({ error: countError.message }, { status: 500 })
  if (count && count > 0) {
    return NextResponse.json(
      { error: 'Cannot delete branch because it still has active employees assigned to it.' },
      { status: 400 }
    )
  }

  const { error } = await service
    .from('branches')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}