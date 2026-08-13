'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPin, Route, X } from 'lucide-react'
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
}

type DailyRouteMapModalProps = {
  isOpen: boolean
  onClose: () => void
  employeeName: string
  date: string
  points: LocationPoint[]
}

export default function DailyRouteMapModal({ isOpen, onClose, employeeName, date, points }: DailyRouteMapModalProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const [mapReady, setMapReady] = useState(false)

  useClickAway(modalRef, () => {
    if (mapReady) onClose()
  })

  useEffect(() => {
    if (!isOpen || !mapRef.current || mapInstanceRef.current || points.length === 0) return

    const firstPoint = points[0]
    const map = L.map(mapRef.current, { center: [firstPoint.lat, firstPoint.lng], zoom: 14, zoomControl: false })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)

    const coordinates = points.map((point) => [point.lat, point.lng] as L.LatLngTuple)
    if (coordinates.length > 1) L.polyline(coordinates, { color: '#2563eb', weight: 4, opacity: 0.75 }).addTo(map)

    points.forEach((point, index) => {
      const marker = L.circleMarker([point.lat, point.lng], {
        radius: index === 0 || index === points.length - 1 ? 7 : 4,
        color: index === 0 ? '#059669' : index === points.length - 1 ? '#dc2626' : '#2563eb',
        fillColor: index === 0 ? '#10b981' : index === points.length - 1 ? '#ef4444' : '#3b82f6',
        fillOpacity: 0.9,
        weight: 2,
      }).addTo(map)
      marker.bindPopup(`<strong>${index === 0 ? 'Start' : index === points.length - 1 ? 'Last location' : `Point ${index + 1}`}</strong><br>${new Date(point.recorded_at).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}<br>${escapeHtml(point.address || `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`)}`)
    })

    if (coordinates.length > 1) map.fitBounds(L.latLngBounds(coordinates), { padding: [32, 32] })
    L.control.zoom({ position: 'topright' }).addTo(map)
    mapInstanceRef.current = map
    setMapReady(true)
    const resizeTimer = window.setTimeout(() => map.invalidateSize(), 100)

    return () => {
      window.clearTimeout(resizeTimer)
      map.remove()
      mapInstanceRef.current = null
      setMapReady(false)
    }
  }, [isOpen, points])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true">
      <div ref={modalRef} className="relative h-[min(680px,85vh)] w-full max-w-4xl overflow-hidden rounded-xl bg-white" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3">
          <div>
            <h2 className="font-semibold text-zinc-900">{employeeName}</h2>
            <p className="text-xs text-zinc-500">{date} ? {points.length} captured locations</p>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:bg-zinc-100" aria-label="Close daily route map"><X size={20} /></button>
        </div>
        {points.length > 0 ? <div ref={mapRef} className="h-[calc(100%-62px)] w-full" /> : <div className="grid h-[calc(100%-62px)] place-items-center text-sm text-zinc-400"><Route size={18} />No locations for this day</div>}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white/95 px-2.5 py-1.5 text-xs text-zinc-600 shadow-sm"><MapPin size={13} className="text-blue-600" />Green start ? Red last location</div>
      </div>
    </div>
  )
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character] ?? character))
}
