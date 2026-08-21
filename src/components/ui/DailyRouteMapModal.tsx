'use client'

import { useEffect, useRef, useState } from 'react'
import {
  MapPin,
  Route,
  X,
  Play,
  Pause,
  RotateCcw,
  Layers,
  Clock,
  Navigation,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Flame,
} from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useClickAway } from '@/hooks/useClickAway'

type LocationPoint = {
  id: string
  lat: number
  lng: number
  address: string | null
  recorded_at: string
  source: string
  accuracy_meters?: number | null
}

type DailyRouteMapModalProps = {
  isOpen: boolean
  onClose: () => void
  employeeName: string
  date: string
  points: LocationPoint[]
}

type RouteMatchResult = {
  roadPolyline: [number, number][]
  totalDistanceKm: number
  stops: {
    lat: number
    lng: number
    address?: string | null
    startTime: string
    endTime: string
    durationMinutes: number
    pointCount: number
  }[]
}

export default function DailyRouteMapModal({
  isOpen,
  onClose,
  employeeName,
  date,
  points,
}: DailyRouteMapModalProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const polylineLayerRef = useRef<L.FeatureGroup | null>(null)
  const playbackMarkerRef = useRef<L.Marker | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  const [loadingRoute, setLoading] = useState(true)
  const [routeData, setRouteData] = useState<RouteMatchResult | null>(null)
  const [activeBaseLayer, setActiveBaseLayer] = useState<'voyager' | 'osm' | 'satellite'>('voyager')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Playback Animation State
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackProgress, setPlaybackProgress] = useState(0) // 0 to 100
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 4>(1)
  const animationFrameRef = useRef<number | null>(null)

  useClickAway(modalRef, () => {
    onClose()
  })

  // Sort points chronologically
  const sortedPoints = [...points].sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
  )

  // 1. Fetch Road-snapped Polyline from API (with instant client cache)
  useEffect(() => {
    if (!isOpen || sortedPoints.length === 0) return

    let isMounted = true

    // Generate unique client storage cache key
    const firstPoint = sortedPoints[0]
    const lastPoint = sortedPoints[sortedPoints.length - 1]
    const cacheKey = `nire_route_${sortedPoints.length}_${firstPoint.lat.toFixed(4)},${firstPoint.lng.toFixed(4)}_${lastPoint.lat.toFixed(4)},${lastPoint.lng.toFixed(4)}_${firstPoint.recorded_at || ''}_${lastPoint.recorded_at || ''}`

    // Check client session cache
    try {
      const cached = sessionStorage.getItem(cacheKey)
      if (cached) {
        const parsed = JSON.parse(cached)
        setRouteData(parsed)
        setLoading(false)
        return
      }
    } catch {
      // ignore storage errors
    }

    // Set initial immediate baseline route to avoid any blank loading
    setRouteData((prev) => prev ?? {
      roadPolyline: sortedPoints.map((p) => [p.lat, p.lng]),
      totalDistanceKm: 0,
      stops: [],
    })
    setLoading(true)

    fetch('/api/tracking/route-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points: sortedPoints }),
    })
      .then((res) => res.json())
      .then((data: RouteMatchResult) => {
        if (!isMounted) return
        setRouteData(data)
        setLoading(false)
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(data))
        } catch {
          // ignore
        }
      })
      .catch((err) => {
        console.warn('Failed to match road route, using raw points:', err)
        if (!isMounted) return
        setRouteData({
          roadPolyline: sortedPoints.map((p) => [p.lat, p.lng]),
          totalDistanceKm: 0,
          stops: [],
        })
        setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [isOpen, points])

  // 2. Initialize Leaflet Map
  useEffect(() => {
    if (!isOpen || !mapRef.current) return

    if (!mapInstanceRef.current) {
      const initialCenter: L.LatLngTuple =
        sortedPoints.length > 0 ? [sortedPoints[0].lat, sortedPoints[0].lng] : [33.6844, 73.0479]

      const map = L.map(mapRef.current, {
        center: initialCenter,
        zoom: 14,
        zoomControl: false,
      })

      L.control.zoom({ position: 'topright' }).addTo(map)
      mapInstanceRef.current = map
    }

    const map = mapInstanceRef.current

    // Set Basemap Layer
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer)
      }
    })

    let tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
    let attribution = '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap'

    if (activeBaseLayer === 'osm') {
      tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      attribution = '&copy; OpenStreetMap contributors'
    } else if (activeBaseLayer === 'satellite') {
      tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      attribution = '&copy; Esri World Imagery'
    }

    L.tileLayer(tileUrl, { attribution, maxZoom: 19 }).addTo(map)

    const timer = window.setTimeout(() => map.invalidateSize(), 150)
    return () => window.clearTimeout(timer)
  }, [isOpen, activeBaseLayer])

  // 3. Render Road Trail & Waypoint Nodes
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !isOpen) return

    // Clear previous vector layers
    if (polylineLayerRef.current) {
      map.removeLayer(polylineLayerRef.current)
    }

    const featureGroup = L.featureGroup()

    const rawCoords = sortedPoints.map((p) => [p.lat, p.lng] as L.LatLngTuple)
    const roadCoords = (routeData?.roadPolyline && routeData.roadPolyline.length > 1
      ? routeData.roadPolyline
      : rawCoords) as L.LatLngTuple[]

    if (roadCoords.length > 1) {
      // 1. Soft glowing outer casing line
      L.polyline(roadCoords, {
        color: '#059669',
        weight: 8,
        opacity: 0.2,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(featureGroup)

      // 2. High-contrast vibrant road trail (Emerald Green #10b981)
      L.polyline(roadCoords, {
        color: '#10b981',
        weight: 4.5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(featureGroup)
    }

    // 3. Render Waypoint Markers (Square nodes matching the reference design)
    sortedPoints.forEach((point, index) => {
      const isStart = index === 0
      const isFinish = index === sortedPoints.length - 1

      if (isStart) {
        // Start Station Marker (Green Circle with white center)
        const startIcon = L.divIcon({
          className: 'custom-start-marker',
          html: `
            <div style="position: relative; width: 22px; height: 22px; display: flex; items-center; justify-content: center;">
              <div style="width: 22px; height: 22px; border-radius: 50%; background: #059669; border: 3px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
                <div style="width: 6px; height: 6px; border-radius: 50%; background: #ffffff;"></div>
              </div>
            </div>
          `,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        })

        const marker = L.marker([point.lat, point.lng], { icon: startIcon }).addTo(featureGroup)
        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; padding: 2px;">
            <div style="font-weight: 700; color: #059669; font-size: 13px;">🟢 Day Start / Check-in</div>
            <div style="font-weight: 600; color: #374151; margin-top: 3px;">${new Date(point.recorded_at).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}</div>
            <div style="color: #6b7280; margin-top: 2px; font-size: 11px;">${escapeHtml(point.address || `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`)}</div>
          </div>
        `)
      } else if (isFinish) {
        // Last / Finish Station Marker with Radial Pulse Ring (Matching the user screenshot!)
        const finishIcon = L.divIcon({
          className: 'custom-finish-marker',
          html: `
            <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
              <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(16, 185, 129, 0.25); animation: pulse-ring 2s infinite;"></div>
              <div style="width: 18px; height: 18px; border-radius: 50%; background: #10b981; border: 3px solid #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.35); z-index: 2;"></div>
            </div>
          `,
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        })

        const marker = L.marker([point.lat, point.lng], { icon: finishIcon }).addTo(featureGroup)
        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; padding: 2px;">
            <div style="font-weight: 700; color: #10b981; font-size: 13px;">🏁 Latest Location / Shift End</div>
            <div style="font-weight: 600; color: #374151; margin-top: 3px;">${new Date(point.recorded_at).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}</div>
            <div style="color: #6b7280; margin-top: 2px; font-size: 11px;">${escapeHtml(point.address || `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`)}</div>
          </div>
        `)
      } else {
        // Intermediate Waypoint Node (Square black-bordered white box like screenshot)
        const squareIcon = L.divIcon({
          className: 'custom-square-node',
          html: `
            <div style="width: 11px; height: 11px; background: #ffffff; border: 2.5px solid #1e293b; border-radius: 2.5px; box-shadow: 0 1px 3px rgba(0,0,0,0.25);"></div>
          `,
          iconSize: [11, 11],
          iconAnchor: [5.5, 5.5],
        })

        const marker = L.marker([point.lat, point.lng], { icon: squareIcon }).addTo(featureGroup)
        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; padding: 2px;">
            <div style="font-weight: 700; color: #1e293b;">Waypoint #${index + 1}</div>
            <div style="font-weight: 600; color: #374151; margin-top: 2px;">${new Date(point.recorded_at).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}</div>
            <div style="color: #6b7280; margin-top: 2px; font-size: 11px;">${escapeHtml(point.address || `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`)}</div>
          </div>
        `)
      }
    })

    // 4. Render Detected Stop / Dwell Points with Colorful Badges
    routeData?.stops?.forEach((stop, idx) => {
      const stopIcon = L.divIcon({
        className: 'custom-stop-badge',
        html: `
          <div style="position: relative; width: 26px; height: 26px; border-radius: 50%; background: #2563eb; border: 2.5px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 11px;">
            ${idx + 1}
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      })

      const marker = L.marker([stop.lat, stop.lng], { icon: stopIcon }).addTo(featureGroup)
      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; padding: 2px;">
          <div style="font-weight: 800; color: #2563eb; font-size: 13px;">⏱️ Stationary Stop #${idx + 1}</div>
          <div style="color: #111827; font-weight: 700; margin-top: 3px;">Stayed for ${stop.durationMinutes} mins</div>
          <div style="color: #6b7280; font-size: 11px; margin-top: 2px;">${new Date(stop.startTime).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })} - ${new Date(stop.endTime).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}</div>
          <div style="color: #4b5563; font-size: 11px; margin-top: 3px;">${escapeHtml(stop.address || 'Stationary location')}</div>
        </div>
      `)
    })

    featureGroup.addTo(map)
    polylineLayerRef.current = featureGroup

    if (roadCoords.length > 1) {
      map.fitBounds(L.latLngBounds(roadCoords), {
        padding: [45, 45],
        maxZoom: 16,
      })
    }
  }, [isOpen, routeData, sortedPoints])

  // 4. Smooth Route Playback Animation Engine
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !isOpen) return

    const roadCoords = (routeData?.roadPolyline && routeData.roadPolyline.length > 1
      ? routeData.roadPolyline
      : sortedPoints.map((p) => [p.lat, p.lng])) as L.LatLngTuple[]

    if (roadCoords.length < 2) return

    // Create moving vehicle marker
    if (!playbackMarkerRef.current) {
      const movingIcon = L.divIcon({
        className: 'playback-moving-marker',
        html: `
          <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: rgba(37, 99, 235, 0.3); animation: pulse-ring 1.5s infinite;"></div>
            <div style="width: 20px; height: 20px; border-radius: 50%; background: #2563eb; border: 3px solid #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white;">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </div>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      })

      playbackMarkerRef.current = L.marker(roadCoords[0], {
        icon: movingIcon,
        zIndexOffset: 1000,
      }).addTo(map)
    }

    const currentIndex = Math.min(
      Math.floor((playbackProgress / 100) * (roadCoords.length - 1)),
      roadCoords.length - 1
    )
    const currentPosition = roadCoords[currentIndex]

    if (playbackMarkerRef.current && currentPosition) {
      playbackMarkerRef.current.setLatLng(currentPosition)
    }

    if (isPlaying) {
      const stepDurationMs = 50 / playbackSpeed
      const stepIncrement = 100 / (roadCoords.length * 1.5)

      const interval = window.setInterval(() => {
        setPlaybackProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false)
            return 100
          }
          return Math.min(prev + stepIncrement, 100)
        })
      }, stepDurationMs)

      return () => window.clearInterval(interval)
    }
  }, [isPlaying, playbackProgress, playbackSpeed, routeData, sortedPoints, isOpen])

  // Helper to focus on a single stop from sidebar
  function focusOnPoint(lat: number, lng: number) {
    const map = mapInstanceRef.current
    if (!map) return
    map.flyTo([lat, lng], 16, { duration: 1.2 })
  }

  if (!isOpen) return null

  const totalDistance = routeData?.totalDistanceKm ?? 0
  const firstPointTime = sortedPoints[0]?.recorded_at
  const lastPointTime = sortedPoints[sortedPoints.length - 1]?.recorded_at

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={modalRef}
        className="relative h-[min(780px,94vh)] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 gap-2 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
              <Route size={19} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-zinc-900 text-base">{employeeName}</h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  <Sparkles size={11} /> Road-Matched
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                {date} · {sortedPoints.length} GPS samples ·{' '}
                {totalDistance > 0 ? `${totalDistance} km traveled` : 'Calculating route...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Basemap Switcher */}
            <div className="flex items-center bg-zinc-100 p-1 rounded-lg border border-zinc-200/70 text-xs">
              <button
                type="button"
                onClick={() => setActiveBaseLayer('voyager')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  activeBaseLayer === 'voyager'
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                Clean
              </button>
              <button
                type="button"
                onClick={() => setActiveBaseLayer('osm')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  activeBaseLayer === 'osm'
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                Streets
              </button>
              <button
                type="button"
                onClick={() => setActiveBaseLayer('satellite')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  activeBaseLayer === 'satellite'
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                Satellite
              </button>
            </div>

            {/* Toggle Sidebar Button */}
            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`p-2 rounded-lg border transition-colors ${
                isSidebarOpen
                  ? 'bg-blue-50 border-blue-200 text-blue-600'
                  : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
              }`}
              title="Toggle Timeline Sidebar"
            >
              <Clock size={16} />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X size={19} />
            </button>
          </div>
        </div>

        {/* Center Content: Map + Collapsible Timeline Sidebar */}
        <div className="relative flex-1 w-full overflow-hidden flex">
          {/* Main Map Viewport */}
          <div className="relative flex-1 h-full w-full bg-zinc-100">
            {sortedPoints.length > 0 ? (
              <div ref={mapRef} className="h-full w-full" />
            ) : (
              <div className="grid h-full place-items-center text-sm text-zinc-400">
                <Route size={20} />
                No GPS coordinates logged for this day
              </div>
            )}

            {/* Loading Indicator */}
            {loadingRoute && (
              <div className="absolute top-4 left-4 z-40 flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-zinc-200 shadow-md text-xs font-semibold text-zinc-700">
                <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                Matching route with road network...
              </div>
            )}

            {/* Map Legend Overlay */}
            <div className="absolute bottom-20 left-4 z-30 flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200/90 bg-white/95 p-2 backdrop-blur-md text-[11px] font-semibold text-zinc-700 shadow-md">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-emerald-600 border-2 border-white shadow-sm"></div>
                <span>Start</span>
              </div>
              <span className="text-zinc-300">|</span>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-white border-2 border-zinc-800 shadow-sm"></div>
                <span>Waypoint</span>
              </div>
              <span className="text-zinc-300">|</span>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow-sm"></div>
                <span>Stationary Stop</span>
              </div>
              <span className="text-zinc-300">|</span>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-sm animate-pulse"></div>
                <span>Latest Location</span>
              </div>
            </div>
          </div>

          {/* Timeline Sidebar (Collapsible) */}
          {isSidebarOpen && (
            <div className="w-80 h-full bg-white border-l border-zinc-200 flex flex-col shrink-0 z-30 shadow-xl">
              <div className="p-3 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/70">
                <span className="font-bold text-zinc-800 text-xs uppercase tracking-wider">
                  Timeline ({sortedPoints.length} stops)
                </span>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="text-zinc-400 hover:text-zinc-600 p-1"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 p-2 text-xs">
                {sortedPoints.map((pt, idx) => (
                  <div
                    key={pt.id || idx}
                    onClick={() => focusOnPoint(pt.lat, pt.lng)}
                    className="p-2.5 hover:bg-zinc-50 rounded-lg cursor-pointer transition-colors space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-800">
                        {idx === 0
                          ? '🟢 Check-in Start'
                          : idx === sortedPoints.length - 1
                          ? '🏁 Latest Location'
                          : `Stop #${idx + 1}`}
                      </span>
                      <span className="text-zinc-500 font-medium">
                        {new Date(pt.recorded_at).toLocaleTimeString('en-PK', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="text-zinc-500 line-clamp-2 leading-relaxed">
                      {pt.address || `${pt.lat.toFixed(5)}, ${pt.lng.toFixed(5)}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Playback & Route Controller Strip */}
        <div className="border-t border-zinc-200 bg-white px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          {/* Play / Pause / Replay Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (playbackProgress >= 100) setPlaybackProgress(0)
                setIsPlaying(!isPlaying)
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95"
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              {isPlaying ? 'Pause' : playbackProgress >= 100 ? 'Replay' : 'Play Journey'}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsPlaying(false)
                setPlaybackProgress(0)
              }}
              className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-600 transition-colors"
              title="Reset to Start"
            >
              <RotateCcw size={14} />
            </button>

            {/* Speed Toggle */}
            <div className="flex items-center bg-zinc-100 p-0.5 rounded-md border border-zinc-200 text-[11px] font-bold">
              {([1, 2, 4] as const).map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`px-2 py-0.5 rounded transition-all ${
                    playbackSpeed === spd
                      ? 'bg-white text-zinc-900 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          {/* Scrubber Timeline Slider */}
          <div className="flex-1 flex items-center gap-3 max-w-xl">
            <span className="text-[11px] font-semibold text-zinc-400 shrink-0">
              {firstPointTime
                ? new Date(firstPointTime).toLocaleTimeString('en-PK', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '08:00 AM'}
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={playbackProgress}
              onChange={(e) => {
                setIsPlaying(false)
                setPlaybackProgress(Number(e.target.value))
              }}
              className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
            <span className="text-[11px] font-semibold text-zinc-400 shrink-0">
              {lastPointTime
                ? new Date(lastPointTime).toLocaleTimeString('en-PK', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '05:00 PM'}
            </span>
          </div>

          {/* Total Trip Distance Badge */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-50 border border-zinc-200/80 text-xs font-bold text-zinc-800">
            <Navigation size={13} className="text-emerald-600" />
            <span>{totalDistance} km</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char] ?? char)
  )
}
