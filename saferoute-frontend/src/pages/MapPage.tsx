import { useState, useCallback, useEffect } from 'react'
import { Layers, Map as MapIcon, Satellite, Loader2 } from 'lucide-react'
import SafeMap from '@/components/SafeMap'
import RoutePlanner from '@/components/RoutePlanner'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import type { RouteResult, HeatmapPoint, SafeSpot } from '@/services/api'

function parseCsvLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      const isEscapedQuote = inQuotes && line[i + 1] === '"'
      if (isEscapedQuote) {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (char === ',' && !inQuotes) {
      values.push(current)
      current = ''
      continue
    }
    current += char
  }
  values.push(current)
  return values.map(v => v.trim())
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return []
  const headers = parseCsvLine(lines[0])
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line)
    const row: Record<string, string> = {}
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? ''
    })
    return row
  })
}

export default function MapPage() {
  const [routes, setRoutes] = useState<RouteResult[] | null>(null)
  const [heatmapData, setHeatmapData] = useState<HeatmapPoint[] | null>(null)
  const [safeSpots, setSafeSpots] = useState<SafeSpot[]>([])
  const [showHeatmap, setShowHeatmap] = useState(true)
  const [showSpots, setShowSpots] = useState(true)
  const [startMarker, setStartMarker] = useState<{ lat: number; lng: number } | null>(null)
  const [endMarker, setEndMarker] = useState<{ lat: number; lng: number } | null>(null)
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0)
  const [routeSearchLoading, setRouteSearchLoading] = useState(false)
  const [travelHour, setTravelHour] = useState(() => new Date().getHours())
  const [baseMapMode, setBaseMapMode] = useState('transit')

  useEffect(() => {
    Promise.all([
      fetch('/data/safety_data_cleaned.csv').then(r => r.text()),
      fetch('/data/crime_incidents.csv').then(r => r.text()),
    ])
      .then(([safeSpotsCsv, incidentsCsv]) => {
        const safeSpotRows = parseCsv(safeSpotsCsv)
        const incidentRows = parseCsv(incidentsCsv)

        const mappedSpots: SafeSpot[] = safeSpotRows
          .map((row: Record<string, string>) => ({
            lat: Number(row.latitude),
            lng: Number(row.longitude),
            type:
              row.surveillance_type === 'camera' ? 'surveillance'
              : /police/i.test(row.name || '') ? 'police_station'
              : /fire/i.test(row.name || '') ? 'fire_station'
              : /hospital|medical|clinic/i.test(row.name || '') ? 'hospital'
              : /7-eleven|mini|store|market/i.test(row.name || '') ? 'convenience_store'
              : 'security_post',
            name: row.name || 'Safe Spot',
            address: row.osm_type ? `${row.osm_type} mapped point` : '',
            hours: row.opening_hours || '24/7',
            city: '',
          }))
          .filter(spot => Number.isFinite(spot.lat) && Number.isFinite(spot.lng))
          .slice(0, 500)

        const mappedHeatmap: HeatmapPoint[] = incidentRows
          .map((row: Record<string, string>) => ({
            lat: Number(row.latitude),
            lng: Number(row.longitude),
            intensity:
              row.incident_type === 'robbery' ? 0.95
              : row.incident_type === 'assault' ? 0.84
              : row.incident_type === 'harassment' ? 0.72
              : 0.62,
          }))
          .filter(point => Number.isFinite(point.lat) && Number.isFinite(point.lng))
          .slice(0, 600)

        setSafeSpots(mappedSpots)
        setHeatmapData(mappedHeatmap)
      })
      .catch(() => {
        setSafeSpots([])
        setHeatmapData([])
      })
  }, [])

  const handleRoutesFound = useCallback((foundRoutes: RouteResult[], markers: { start?: { lat: number; lng: number }; end?: { lat: number; lng: number } }) => {
    setRoutes(foundRoutes)
    setSelectedRouteIndex(0)
    if (markers?.start && markers?.end) {
      setStartMarker({ lat: markers.start.lat, lng: markers.start.lng })
      setEndMarker({ lat: markers.end.lat, lng: markers.end.lng })
    }
  }, [])

  const handleSafeSpotsFound = useCallback((spots: SafeSpot[]) => {
    if (Array.isArray(spots) && spots.length > 0) {
      setSafeSpots(spots)
    }
  }, [])

  const handleMapClick = useCallback(() => {
    // Future: tap-to-set start/end
  }, [])

  return (
    <div className="flex h-[calc(100vh-5rem)]">
      <RoutePlanner
        travelHour={travelHour}
        onTravelHourChange={setTravelHour}
        onRoutesFound={handleRoutesFound}
        onSafeSpotsFound={handleSafeSpotsFound}
        onSelectedRouteChange={setSelectedRouteIndex}
        onLoadingChange={setRouteSearchLoading}
      />

      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0 z-0 min-h-0">
          <SafeMap
            routes={routes}
            highlightedRouteIndex={selectedRouteIndex}
            baseMapMode={baseMapMode}
            heatmapData={showHeatmap ? heatmapData : null}
            safeSpots={showSpots ? safeSpots : []}
            onMapClick={handleMapClick}
            startMarker={startMarker}
            endMarker={endMarker}
          />
        </div>

        {routeSearchLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-6 shadow-lg">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Calculating safest routes...</p>
            </div>
          </div>
        )}

        {!routes?.length && !routeSearchLoading && (
          <div className="absolute top-4 left-1/2 z-10 -translate-x-1/2 rounded-xl border border-border bg-card/90 p-4 shadow-md backdrop-blur-sm">
            <h2 className="text-sm font-semibold text-foreground">Map Preview Ready</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Use Layers to toggle features, or enter start/destination to route.
            </p>
          </div>
        )}

        <div className="absolute right-4 top-4 z-50">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-xl bg-card/90 shadow-md backdrop-blur-sm"
              >
                <Layers className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="z-[60] w-64">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Map Layers</h3>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="safe-spots-switch" className="cursor-pointer text-sm">
                      Safe Spots
                    </Label>
                    <Switch
                      id="safe-spots-switch"
                      checked={showSpots}
                      onCheckedChange={setShowSpots}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="heatmap-switch" className="cursor-pointer text-sm">
                      Crime Heatmap
                    </Label>
                    <Switch
                      id="heatmap-switch"
                      checked={showHeatmap}
                      onCheckedChange={setShowHeatmap}
                    />
                  </div>
                </div>
                <Separator />
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">Base Map</p>
                  <div className="flex gap-2">
                    <Button
                      variant={baseMapMode === 'transit' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setBaseMapMode('transit')}
                      className="flex-1 gap-1.5"
                    >
                      <MapIcon className="h-3.5 w-3.5" /> Transit
                    </Button>
                    <Button
                      variant={baseMapMode === 'satellite' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setBaseMapMode('satellite')}
                      className="flex-1 gap-1.5"
                    >
                      <Satellite className="h-3.5 w-3.5" /> Satellite
                    </Button>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  )
}
