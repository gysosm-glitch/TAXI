import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, CircleMarker, Polyline, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { CHEONGJU_CENTER } from '../data.js'

const icon = (html, size = 36) => L.divIcon({ html, className: 'map-icon', iconSize: [size, size], iconAnchor: [size / 2, size / 2] })

export const taxiIcon = (heading = 0, mine = false) =>
  icon(`<div class="taxi-pin ${mine ? 'mine' : ''}" style="transform:rotate(${heading}deg)">🚕</div>`, mine ? 44 : 30)
export const spotIcon = (tier, label) =>
  L.divIcon({ html: `<div class="spot-pin t${tier}"><span>${label}</span></div>`, className: 'map-icon', iconSize: [0, 0], iconAnchor: [0, 0] })
export const dotIcon = (cls) => icon(`<div class="dot ${cls}"></div>`, 18)

function FitTo({ bounds, center, zoom }) {
  const map = useMap()
  useEffect(() => {
    if (bounds && bounds.length > 1) map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 })
    else if (center) map.setView(center, zoom ?? map.getZoom())
  }, [JSON.stringify(bounds), JSON.stringify(center), zoom])
  return null
}

export default function MapView({ center = CHEONGJU_CENTER, zoom = 12, bounds, children, className = '' }) {
  return (
    <MapContainer center={center} zoom={zoom} zoomControl={false} attributionControl className={`map ${className}`}>
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={19}
      />
      <FitTo bounds={bounds} center={bounds ? null : center} zoom={zoom} />
      {children}
    </MapContainer>
  )
}

export { Marker, CircleMarker, Polyline, Tooltip }
