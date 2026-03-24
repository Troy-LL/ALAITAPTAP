import { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.heat'
import type { RouteResult, HeatmapPoint, SafeSpot } from '../services/api'

// Fix Leaflet default icon
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// @ts-expect-error _getIconUrl is a private property not in the type definitions
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

// Metro Manila center
const METRO_MANILA: [number, number] = [14.5995, 121.0175]
const SAFE_SPOT_MIN_ZOOM = 14
const CARTO_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

const TILE_LAYER_CONFIG = {
  transit_dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    options: { attribution: CARTO_ATTRIBUTION, subdomains: 'abcd', maxZoom: 20 },
  },
  transit_light: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    options: { attribution: CARTO_ATTRIBUTION, subdomains: 'abcd', maxZoom: 20 },
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    options: {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; Esri',
      maxZoom: 20,
    },
  },
}

interface SafeMapProps {
  routes: RouteResult[] | null
  baseMapMode?: string
  heatmapData: HeatmapPoint[] | null
  safeSpots: SafeSpot[]
  onMapClick?: (latlng: L.LatLng) => void
  startMarker: { lat: number; lng: number } | null
  endMarker: { lat: number; lng: number } | null
  highlightedRouteIndex?: number
}

export default function SafeMap({
  routes,
  baseMapMode = 'transit',
  heatmapData,
  safeSpots,
  onMapClick,
  startMarker,
  endMarker,
  highlightedRouteIndex = 0,
}: SafeMapProps) {
  const { resolvedTheme } = useTheme()
  const [mapZoom, setMapZoom] = useState(13)
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const routeLayers = useRef<L.Layer[]>([])
  const heatLayer = useRef<L.Layer | null>(null)
  const spotsLayer = useRef<L.Layer[]>([])
  const endpointMarkers = useRef<L.Marker[]>([])
  const baseLayerRef = useRef<L.TileLayer | null>(null)

  // Initialize map
  useEffect(() => {
    if (mapInstance.current) return

    const map = L.map(mapRef.current!, {
      center: METRO_MANILA,
      zoom: 13,
      zoomControl: true,
    })

    const initialLayerConfig = TILE_LAYER_CONFIG.transit_dark
    baseLayerRef.current = L.tileLayer(initialLayerConfig.url, initialLayerConfig.options).addTo(map)

    mapInstance.current = map
    setMapZoom(map.getZoom())

    const handleZoomEnd = () => setMapZoom(map.getZoom())
    map.on('zoomend', handleZoomEnd)

    return () => {
      map.off('zoomend', handleZoomEnd)
      map.remove()
      mapInstance.current = null
    }
  }, [])

  // Switch basemap style — reacts to both user-chosen mode and dark/light theme
  useEffect(() => {
    const map = mapInstance.current
    if (!map) return

    if (baseLayerRef.current) {
      map.removeLayer(baseLayerRef.current)
      baseLayerRef.current = null
    }

    let tileKey: keyof typeof TILE_LAYER_CONFIG
    if (baseMapMode === 'satellite') {
      tileKey = 'satellite'
    } else {
      tileKey = resolvedTheme === 'light' ? 'transit_light' : 'transit_dark'
    }

    const nextLayerConfig = TILE_LAYER_CONFIG[tileKey]
    baseLayerRef.current = L.tileLayer(nextLayerConfig.url, nextLayerConfig.options).addTo(map)
  }, [baseMapMode, resolvedTheme])

  // Update click handler when callback changes
  useEffect(() => {
    const map = mapInstance.current
    if (!map) return
    map.off('click')
    map.on('click', (e) => {
      if (onMapClick) onMapClick(e.latlng)
    })
  }, [onMapClick])

  // Draw routes
  useEffect(() => {
    const map = mapInstance.current
    if (!map) return

    // Clear old routes
    routeLayers.current.forEach(l => map.removeLayer(l))
    routeLayers.current = []

    if (!routes || routes.length === 0) return

    const COLORS: Record<string, string> = {
      green:  '#FF91A4',   // pink for the safest route (brand primary)
      yellow: '#F59E0B',
      red:    '#EF4444',
    }
    const WIDTHS = [5, 4, 3.5]

    routes.forEach((route, idx) => {
      // Convert [lng, lat] → [lat, lng] for Leaflet
      const latlngs = route.geometry.map(([lng, lat]): [number, number] => [lat, lng])
      const color = COLORS[route.color] || '#FF91A4'
      const weight = WIDTHS[idx] || 3
      const isHighlighted = idx === highlightedRouteIndex

      // Soft glow halo behind the route line
      const glowLine = L.polyline(latlngs, {
        color,
        weight: weight + 8,
        opacity: isHighlighted ? 0.2 : 0.08,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map)

      const line = L.polyline(latlngs, {
        color,
        weight,
        opacity: isHighlighted ? 0.95 : 0.45,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: isHighlighted ? undefined : '8 6',
      }).addTo(map)

      // Firefly animation on the highlighted (selected) route
      if (isHighlighted) {
        // Wait one tick so the element is in the DOM
        setTimeout(() => {
          const el = line.getElement()
          if (el) el.classList.add('leaflet-firefly')
        }, 0)
      }

      line.bindTooltip(`
        <div style="font-family: 'Poppins', sans-serif; font-size: 13px; line-height: 1.6;">
          <strong>Route ${idx + 1}</strong><br/>
          Safety: ${route.safety_score}/100 (${route.safety_label})<br/>
          ${route.distance_km} km &middot; ${route.duration_minutes} min
        </div>
      `, { sticky: true })

      routeLayers.current.push(glowLine, line)
    })

    // Fit map to route bounds
    if (routes[0]?.geometry?.length > 0) {
      const allCoords = routes.flatMap(r => r.geometry).map(([lng, lat]): [number, number] => [lat, lng])
      map.fitBounds(L.latLngBounds(allCoords), { padding: [60, 60] })
    }
  }, [routes, highlightedRouteIndex])

  // Draw heatmap
  useEffect(() => {
    const map = mapInstance.current
    if (!map) return

    // Remove old heatmap
    if (heatLayer.current) {
      map.removeLayer(heatLayer.current)
      heatLayer.current = null
    }

    if (!heatmapData || heatmapData.length === 0) return

    // Use leaflet.heat if available
    if (typeof (L as any).heatLayer === 'function') {
      const points = heatmapData.map(d => [
        d.lat,
        d.lng,
        typeof d.intensity === 'number' ? d.intensity : 0.6,
      ])
      const layer = (L as any).heatLayer(points, {
        radius: 20,
        blur: 15,
        minOpacity: 0.4,
        gradient: {
          0.0: '#10B981',
          0.4: '#F59E0B',
          0.7: '#EF4444',
          1.0: '#B91C1C'
        }
      }).addTo(map)
      heatLayer.current = layer
    } else {
      // Fallback: circle markers
      heatmapData.slice(0, 200).forEach(d => {
        const opacity = d.intensity * 0.6
        const radius = 10 + d.intensity * 15
        const layer = L.circleMarker([d.lat, d.lng], {
          radius: radius,
          fillColor: '#EF4444',
          fillOpacity: opacity,
          stroke: false
        }).addTo(map)
        routeLayers.current.push(layer)
      })
    }
  }, [heatmapData])

  // Draw safe spots
  useEffect(() => {
    const map = mapInstance.current
    if (!map) return

    spotsLayer.current.forEach(l => map.removeLayer(l))
    spotsLayer.current = []

    if (!safeSpots || safeSpots.length === 0) return
    if (mapZoom < SAFE_SPOT_MIN_ZOOM) return

    const TYPE_ICONS: Record<string, { label: string; color: string }> = {
      police_station: { label: 'Police Station', color: '#3b82f6' },
      convenience_store: { label: 'Convenience Store', color: '#f59e0b' },
      security_post: { label: 'Security Post', color: '#10b981' },
      hospital: { label: 'Hospital', color: '#ef4444' },
      fire_station: { label: 'Fire Station', color: '#f97316' },
      street_lamp: { label: 'Street Lamp', color: '#eab308' },
      surveillance: { label: 'Surveillance', color: '#8b5cf6' },
    }
    const dotRadius = Math.min(6, Math.max(3, mapZoom - 10))

    safeSpots.forEach(spot => {
      const typeMeta = TYPE_ICONS[spot.type] || { label: 'Safe Spot', color: '#22c55e' }
      const marker = L.circleMarker([spot.lat, spot.lng], {
        radius: dotRadius,
        color: 'rgba(12, 17, 24, 0.95)',
        weight: 1.5,
        fillColor: typeMeta.color,
        fillOpacity: 0.95,
      })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: 'DM Sans', sans-serif; font-size: 13px; line-height: 1.6;">
            <strong>${spot.name}</strong><br/>
            <span style="color: ${typeMeta.color};">${typeMeta.label}</span><br/>
            ${spot.address ? `${spot.address}<br/>` : ''}
            ${spot.hours || '—'}<br/>
            ${spot.city || ''}
            ${spot.distance_km != null ? `<br/><strong>${spot.distance_km} km away</strong>` : ''}
          </div>
        `)
      spotsLayer.current.push(marker)
    })
  }, [safeSpots, mapZoom])

  // Start / end markers (geocoded search points)
  useEffect(() => {
    const map = mapInstance.current
    if (!map) return

    endpointMarkers.current.forEach(m => map.removeLayer(m))
    endpointMarkers.current = []

    const startIcon = L.divIcon({
      className: 'endpoint-marker endpoint-start',
      html: '<div class="endpoint-pin">A</div>',
      iconSize: [28, 36],
      iconAnchor: [14, 36],
    })
    const endIcon = L.divIcon({
      className: 'endpoint-marker endpoint-end',
      html: '<div class="endpoint-pin">B</div>',
      iconSize: [28, 36],
      iconAnchor: [14, 36],
    })

    if (startMarker) {
      const m = L.marker([startMarker.lat, startMarker.lng], { icon: startIcon })
        .addTo(map)
        .bindPopup('Start')
      endpointMarkers.current.push(m)
    }
    if (endMarker) {
      const m = L.marker([endMarker.lat, endMarker.lng], { icon: endIcon })
        .addTo(map)
        .bindPopup('Destination')
      endpointMarkers.current.push(m)
    }
  }, [startMarker, endMarker])

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} id="safemap" className="w-full h-full" />

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] rounded-2xl border border-border bg-card/90 backdrop-blur-sm p-3 shadow-lg">
        <div className="mb-2 text-xs font-semibold text-foreground">Route Safety</div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: '#FF91A4', boxShadow: '0 0 6px rgba(255,145,164,0.6)' }} />
          Safe
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: '#f59e0b' }} />
          Moderate
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: '#ef4444' }} />
          High Risk
        </div>
      </div>
    </div>
  )
}
