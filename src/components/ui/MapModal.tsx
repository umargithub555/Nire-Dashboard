'use client'
import { useEffect, useRef, useState } from 'react'
import { X, MapPin } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useClickAway } from '@/hooks/useClickAway'

// Fix Leaflet marker icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

interface MapModalProps {
  isOpen: boolean
  onClose: () => void
  lat: number
  lng: number
  address: string
  employeeName: string
  branchName: string
}

export default function MapModal({ isOpen, onClose, lat, lng, address, employeeName, branchName }: MapModalProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const [isMapReady, setIsMapReady] = useState(false)

  useClickAway(modalRef, () => {
    if (isMapReady) onClose()
  })

  useEffect(() => {
    if (!isOpen || !mapRef.current || mapInstanceRef.current) return

    const map = L.map(mapRef.current, {
      center: [lat, lng],
      zoom: 16,
      zoomControl: false,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)

    const customIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    })

    L.marker([lat, lng], { icon: customIcon }).addTo(map)
      .bindPopup(`<b>${employeeName}</b><br>${branchName}<br>${address}`)
      .openPopup()

    // Add zoom control to top-right
    L.control.zoom({ position: 'topright' }).addTo(map)

    mapInstanceRef.current = map
    setIsMapReady(true)

    // Invalidate size after modal animation
    setTimeout(() => map.invalidateSize(), 100)

    return () => {
      map.remove()
      mapInstanceRef.current = null
      setIsMapReady(false)
    }
  }, [isOpen, lat, lng, employeeName, branchName, address])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="map-modal-title"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl h-[500px] bg-white rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 sticky top-0 bg-white z-10">
          <div>
            <h2 id="map-modal-title" className="font-semibold text-zinc-900">{employeeName}</h2>
            <p className="text-xs text-zinc-500">{branchName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
            aria-label="Close map"
          >
            <X size={20} />
          </button>
        </div>

        {/* Map Container */}
        <div ref={mapRef} className="w-full h-[calc(100%-60px)]" />

        {/* Address footer */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-sm border-t border-zinc-200">
          <div className="flex items-start gap-2 text-xs text-zinc-600">
            <MapPin size={13} className="text-blue-600 shrink-0 mt-0.5" />
            <span className="max-w-[80%] truncate">{address}</span>
          </div>
        </div>
      </div>
    </div>
  )
}