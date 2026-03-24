import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  MapPin,
  Navigation,
  Clock,
  Shield,
  Ruler,
  Timer,
  Star,
  Loader2,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import BuddyAlert from '@/components/BuddyAlert'
import type { RouteResult, SafeSpot } from '@/services/api'
import { calculateRoute, geocodeAddress, getSafeSpots } from '@/services/api'

interface RouteContext {
  start: { lat: number; lng: number }
  end: { lat: number; lng: number }
  startLabel: string
  endLabel: string
}

interface RoutePlannerProps {
  travelHour?: number
  onTravelHourChange?: (hour: number) => void
  onRoutesFound: (
    routes: RouteResult[],
    markers: {
      start: { lat: number; lng: number }
      end: { lat: number; lng: number }
    },
  ) => void
  onSafeSpotsFound?: (spots: SafeSpot[]) => void
  onSelectedRouteChange?: (index: number) => void
  onLoadingChange?: (loading: boolean) => void
}

const SCORE_COLORS: Record<string, string> = {
  green: '#22c55e',
  yellow: '#f59e0b',
  red: '#ef4444',
}

export default function RoutePlanner({
  travelHour,
  onTravelHourChange,
  onRoutesFound,
  onSafeSpotsFound,
  onSelectedRouteChange,
  onLoadingChange,
}: RoutePlannerProps) {
  const [startInput, setStartInput] = useState('')
  const [endInput, setEndInput] = useState('')
  const hour = travelHour ?? new Date().getHours()
  const setHour = onTravelHourChange ?? (() => {})
  const [loading, setLoading] = useState(false)
  const [routes, setRoutes] = useState<RouteResult[] | null>(null)
  const [selectedRoute, setSelectedRoute] = useState(0)
  const [routeContext, setRouteContext] = useState<RouteContext | null>(null)

  useEffect(() => {
    onLoadingChange?.(loading)
  }, [loading, onLoadingChange])

  useEffect(() => {
    if (!routes?.length) return
    setSelectedRoute(0)
    onSelectedRouteChange?.(0)
  }, [routes, onSelectedRouteChange])

  async function geocode(query: string) {
    const results = await geocodeAddress(query)
    if (!results || results.length === 0)
      throw new Error(`No results for "${query}"`)
    return results[0]
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!startInput || !endInput) {
      toast.error('Please enter both start and end locations')
      return
    }

    setLoading(true)
    setRoutes(null)
    setSelectedRoute(0)

    try {
      const [start, end] = await Promise.all([
        geocode(startInput + ' Metro Manila Philippines'),
        geocode(endInput + ' Metro Manila Philippines'),
      ])

      setRouteContext({
        start,
        end,
        startLabel: startInput,
        endLabel: endInput,
      })

      const routeData = await calculateRoute(
        start.lat,
        start.lng,
        end.lat,
        end.lng,
        hour,
      )

      setRoutes(routeData)
      onRoutesFound(routeData, { start, end })

      const spotsData = await getSafeSpots(
        (start.lat + end.lat) / 2,
        (start.lng + end.lng) / 2,
        1.5,
      )
      onSafeSpotsFound?.(spotsData)
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { detail?: unknown } }
        message?: string
      }
      const detail = axiosErr.response?.data?.detail
      const msg =
        typeof detail === 'string'
          ? detail
          : detail
            ? JSON.stringify(detail)
            : axiosErr.message || 'Failed to calculate route'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const timeLabel = `${String(hour).padStart(2, '0')}:00`

  return (
    <aside
      className="flex h-full w-[380px] min-w-[380px] flex-col border-r border-border bg-card"
      role="region"
      aria-label="Route planner"
    >
      {/* Header */}
      <div className="border-b border-border p-6">
        <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-foreground">
          <Shield className="h-5 w-5 text-primary" />
          Plan Safe Route
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your walkway in Metro Manila
        </p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Form */}
        <form onSubmit={handleSearch} className="space-y-5 p-6">
          {/* Start location */}
          <div className="space-y-2">
            <Label
              htmlFor="start-location"
              className="flex items-center gap-1.5 text-sm font-medium"
            >
              <MapPin className="h-3.5 w-3.5 text-primary" />
              From
            </Label>
            <Input
              id="start-location"
              placeholder="e.g., Katipunan MRT Station"
              value={startInput}
              onChange={(e) => setStartInput(e.target.value)}
              aria-label="Starting point"
            />
          </div>

          {/* End location */}
          <div className="space-y-2">
            <Label
              htmlFor="end-location"
              className="flex items-center gap-1.5 text-sm font-medium"
            >
              <Navigation className="h-3.5 w-3.5 text-primary" />
              To
            </Label>
            <Input
              id="end-location"
              placeholder="e.g., Ateneo Gate 1"
              value={endInput}
              onChange={(e) => setEndInput(e.target.value)}
              aria-label="Destination"
            />
          </div>

          {/* Time slider */}
          <div className="space-y-3">
            <Label
              htmlFor="time-slider"
              className="flex items-center gap-1.5 text-sm font-medium"
            >
              <Clock className="h-3.5 w-3.5 text-primary" />
              Time of Travel:
              <span className="ml-auto font-mono text-xs text-primary">
                {timeLabel}
              </span>
            </Label>
            <Slider
              id="time-slider"
              min={0}
              max={23}
              step={1}
              value={[hour]}
              onValueChange={(val: number[]) => setHour(val[0])}
              aria-valuetext={`${hour} hours`}
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>6am</span>
              <span>Noon</span>
              <span>Midnight</span>
            </div>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
            id="find-route-btn"
            aria-label="Find safe routes"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Find Safest Route
              </>
            )}
          </Button>
        </form>

        {/* Route results */}
        {routes && (
          <div className="space-y-3 px-6 pb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Results header */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">
                {routes.length} Routes Found
              </span>
              <span className="text-xs text-muted-foreground">
                Sorted by safety
              </span>
            </div>

            {/* Route cards */}
            {routes.map((route, idx) => (
              <Card
                key={route.route_id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedRoute === idx
                    ? 'ring-2 ring-primary shadow-md'
                    : 'hover:border-primary/30'
                }`}
                onClick={() => {
                  setSelectedRoute(idx)
                  onSelectedRouteChange?.(idx)
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSelectedRoute(idx)
                    onSelectedRouteChange?.(idx)
                  }
                }}
                aria-pressed={selectedRoute === idx}
                aria-label={`Route option ${idx + 1}, safety ${route.safety_score} of 100`}
              >
                <CardHeader className="px-4 pt-3 pb-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      {idx === 0 ? (
                        <>
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          Recommended
                        </>
                      ) : (
                        `Option ${idx + 1}`
                      )}
                    </span>
                    <Badge
                      variant={
                        route.color === 'green'
                          ? 'default'
                          : route.color === 'yellow'
                            ? 'secondary'
                            : 'destructive'
                      }
                      className="text-[11px]"
                    >
                      {route.safety_label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2.5 px-4 pb-3">
                  {/* Safety score bar */}
                  <div className="flex items-center gap-3">
                    <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${route.safety_score}%`,
                          backgroundColor: SCORE_COLORS[route.color],
                        }}
                      />
                    </div>
                    <span
                      className="text-xs font-semibold tabular-nums"
                      style={{ color: SCORE_COLORS[route.color] }}
                    >
                      {route.safety_score}/100
                    </span>
                  </div>

                  {/* Route stats */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Ruler className="h-3 w-3" />
                      {route.distance_km} km
                    </span>
                    <span className="flex items-center gap-1">
                      <Timer className="h-3 w-3" />~{route.duration_minutes}{' '}
                      min walk
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}

            <BuddyAlert routeContext={routeContext} disabled={!routeContext} />
          </div>
        )}
      </div>
    </aside>
  )
}
