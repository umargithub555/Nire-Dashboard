import { getMobileEmployee } from '@/lib/mobile-auth'
import { reverseGeocodeOpenStreetMap } from '@/lib/reverse-geocode'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const ctx = await getMobileEmployee(req)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const { searchParams } = new URL(req.url)
  const lat = Number(searchParams.get('lat'))
  const lng = Number(searchParams.get('lng'))
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'Valid latitude and longitude are required.' }, { status: 400 })
  }

  const address = await reverseGeocodeOpenStreetMap(lat, lng)
  return NextResponse.json({ address })
}
