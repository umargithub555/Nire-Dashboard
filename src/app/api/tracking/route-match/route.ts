import { NextRequest, NextResponse } from 'next/server'

type InputPoint = {
  id?: string
  lat: number
  lng: number
  address?: string | null
  recorded_at?: string
  source?: string
  accuracy_meters?: number | null
}

// In-Memory Server Cache for Route Match Results (Prevents re-calling LocationIQ/OSRM)
const routeCache = new Map<
  string,
  {
    data: any
    timestamp: number
  }
>()

// Clean cache entries older than 24 hours
function cleanOldCache() {
  const ONE_DAY = 24 * 60 * 60 * 1000
  const now = Date.now()
  for (const [key, value] of routeCache.entries()) {
    if (now - value.timestamp > ONE_DAY) {
      routeCache.delete(key)
    }
  }
}

function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export async function POST(req: NextRequest) {
  try {
    const { points }: { points: InputPoint[] } = await req.json()

    if (!points || !Array.isArray(points) || points.length < 2) {
      return NextResponse.json({
        roadPolyline: points ? points.map(p => [p.lat, p.lng]) : [],
        totalDistanceKm: 0,
        stops: [],
      })
    }

    // Filter out invalid coordinates
    const validPoints = points.filter(
      p => typeof p.lat === 'number' && typeof p.lng === 'number' && !isNaN(p.lat) && !isNaN(p.lng)
    )

    if (validPoints.length < 2) {
      return NextResponse.json({
        roadPolyline: validPoints.map(p => [p.lat, p.lng]),
        totalDistanceKm: 0,
        stops: [],
      })
    }

    // Generate unique cache key based on point timestamps and count
    const firstPoint = validPoints[0]
    const lastPoint = validPoints[validPoints.length - 1]
    const cacheKey = `${validPoints.length}_${firstPoint.lat.toFixed(4)},${firstPoint.lng.toFixed(4)}_${lastPoint.lat.toFixed(4)},${lastPoint.lng.toFixed(4)}_${firstPoint.recorded_at || ''}_${lastPoint.recorded_at || ''}`

    if (routeCache.has(cacheKey)) {
      const cached = routeCache.get(cacheKey)!
      return NextResponse.json({
        ...cached.data,
        cached: true,
      })
    }

    // Identify stationary stops (consecutive points within 40 meters)
    const stops: {
      lat: number
      lng: number
      address?: string | null
      startTime: string
      endTime: string
      durationMinutes: number
      pointCount: number
    }[] = []

    let currentStopGroup: InputPoint[] = [validPoints[0]]

    for (let i = 1; i < validPoints.length; i++) {
      const prev = currentStopGroup[currentStopGroup.length - 1]
      const curr = validPoints[i]
      const dist = calculateDistanceMeters(prev.lat, prev.lng, curr.lat, curr.lng)

      if (dist < 40) {
        currentStopGroup.push(curr)
      } else {
        if (
          currentStopGroup.length >= 2 &&
          currentStopGroup[0].recorded_at &&
          currentStopGroup[currentStopGroup.length - 1].recorded_at
        ) {
          const t1 = new Date(currentStopGroup[0].recorded_at!).getTime()
          const t2 = new Date(currentStopGroup[currentStopGroup.length - 1].recorded_at!).getTime()
          const durationMins = Math.round((t2 - t1) / 60000)
          if (durationMins >= 10) {
            stops.push({
              lat: currentStopGroup[0].lat,
              lng: currentStopGroup[0].lng,
              address: currentStopGroup[0].address || null,
              startTime: currentStopGroup[0].recorded_at!,
              endTime: currentStopGroup[currentStopGroup.length - 1].recorded_at!,
              durationMinutes: durationMins,
              pointCount: currentStopGroup.length,
            })
          }
        }
        currentStopGroup = [curr]
      }
    }

    // Deduplicate consecutive points that are too close (< 30m) for routing API
    const routeWaypoints: InputPoint[] = [validPoints[0]]
    for (let i = 1; i < validPoints.length; i++) {
      const last = routeWaypoints[routeWaypoints.length - 1]
      const curr = validPoints[i]
      const dist = calculateDistanceMeters(last.lat, last.lng, curr.lat, curr.lng)
      if (dist >= 30 || i === validPoints.length - 1) {
        routeWaypoints.push(curr)
      }
    }

    // Chunk into batches of up to 25 waypoints to avoid URL limit
    const CHUNK_SIZE = 25
    const chunks: InputPoint[][] = []

    for (let i = 0; i < routeWaypoints.length; i += CHUNK_SIZE - 1) {
      const chunk = routeWaypoints.slice(i, i + CHUNK_SIZE)
      if (chunk.length >= 2) {
        chunks.push(chunk)
      }
      if (i + CHUNK_SIZE >= routeWaypoints.length) break
    }

    if (chunks.length === 0) {
      chunks.push(routeWaypoints)
    }

    const apiKey = process.env.LOCATIONIQ_API_KEY || ''

    // Process chunks in parallel for maximum speed
    const chunkPromises = chunks.map(async (chunk) => {
      const coordString = chunk.map(p => `${p.lng},${p.lat}`).join(';')
      let chunkGeometry: [number, number][] | null = null
      let chunkDistance = 0

      // 1. Try LocationIQ
      if (apiKey) {
        try {
          const url = `https://us1.locationiq.com/v1/directions/driving/${coordString}?key=${apiKey}&overview=full&geometries=geojson`
          const res = await fetch(url, { next: { revalidate: 3600 } })
          if (res.ok) {
            const data = await res.json()
            if (data.routes && data.routes[0]) {
              chunkDistance = data.routes[0].distance || 0
              chunkGeometry = data.routes[0].geometry.coordinates.map(
                (coord: [number, number]) => [coord[1], coord[0]] as [number, number]
              )
            }
          }
        } catch (err) {
          console.warn('LocationIQ routing error, falling back to OSRM:', err)
        }
      }

      // 2. Fallback to OSRM if LocationIQ unavailable or rate limited
      if (!chunkGeometry || chunkGeometry.length === 0) {
        try {
          const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`
          const res = await fetch(osrmUrl, { next: { revalidate: 3600 } })
          if (res.ok) {
            const data = await res.json()
            if (data.routes && data.routes[0]) {
              chunkDistance = data.routes[0].distance || 0
              chunkGeometry = data.routes[0].geometry.coordinates.map(
                (coord: [number, number]) => [coord[1], coord[0]] as [number, number]
              )
            }
          }
        } catch (err) {
          console.warn('OSRM routing error:', err)
        }
      }

      // 3. Fallback to straight segments if both failed
      if (!chunkGeometry || chunkGeometry.length === 0) {
        chunkGeometry = chunk.map(p => [p.lat, p.lng])
        for (let j = 0; j < chunk.length - 1; j++) {
          chunkDistance += calculateDistanceMeters(chunk[j].lat, chunk[j].lng, chunk[j + 1].lat, chunk[j + 1].lng)
        }
      }

      return { chunkGeometry, chunkDistance }
    })

    const results = await Promise.all(chunkPromises)

    let fullPolyline: [number, number][] = []
    let totalMeters = 0

    results.forEach(({ chunkGeometry, chunkDistance }, index) => {
      totalMeters += chunkDistance
      if (index === 0) {
        fullPolyline = chunkGeometry
      } else {
        fullPolyline.push(...chunkGeometry.slice(1))
      }
    })

    const totalDistanceKm = Number((totalMeters / 1000).toFixed(1))

    const responsePayload = {
      roadPolyline: fullPolyline,
      totalDistanceKm,
      stops,
      waypointCount: validPoints.length,
    }

    // Save to in-memory cache
    cleanOldCache()
    routeCache.set(cacheKey, {
      data: responsePayload,
      timestamp: Date.now(),
    })

    return NextResponse.json(responsePayload)
  } catch (error) {
    console.error('Error in route-match:', error)
    return NextResponse.json({ error: 'Failed to compute road route' }, { status: 500 })
  }
}
