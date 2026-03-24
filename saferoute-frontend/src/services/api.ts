import axios from 'axios'

const API_BASE_URL =
  import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : '')

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

export interface GeocodedLocation {
  label: string
  lat: number
  lng: number
}

export interface RouteResult {
  route_id: string
  geometry: [number, number][]
  distance_km: number
  duration_minutes: number
  safety_score: number
  safety_label: string
  color: 'green' | 'yellow' | 'red'
}

export interface HeatmapPoint {
  lat: number
  lng: number
  intensity: number
}

export interface SafeSpot {
  lat: number
  lng: number
  type: string
  name: string
  address?: string
  hours?: string
  city?: string
  distance_km?: number
}

export interface BuddyAlertPayload {
  user_name: string
  current_lat: number
  current_lng: number
  current_address: string
  destination: string
  buddy_phone: string
}

export async function calculateRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  timeOfDay: number | null = null
): Promise<RouteResult[]> {
  const { data } = await api.post('/api/calculate-route', {
    start_lat: startLat,
    start_lng: startLng,
    end_lat: endLat,
    end_lng: endLng,
    time_of_day: timeOfDay ?? new Date().getHours(),
  })
  return data
}

export async function geocodeAddress(address: string): Promise<GeocodedLocation[]> {
  const { data } = await api.get('/api/geocode', { params: { address } })
  return data.results || []
}

export async function getHeatmapBbox(params: Record<string, number>): Promise<HeatmapPoint[]> {
  const { data } = await api.get('/api/heatmap', { params })
  return data
}

export async function getDangerHeatmap(timeOfDay: number | null = null): Promise<HeatmapPoint[]> {
  const { data } = await api.get('/api/danger-heatmap', {
    params: timeOfDay != null ? { time_of_day: timeOfDay } : {},
  })
  return data
}

export async function getSafeSpots(
  lat: number,
  lng: number,
  radiusKm: number = 2
): Promise<SafeSpot[]> {
  const { data } = await api.get('/api/safe-spots', {
    params: { lat, lng, radius_km: radiusKm },
  })
  return data
}

export async function getNearestSafeSpot(
  lat: number,
  lng: number,
  radiusKm: number = 10
): Promise<SafeSpot | null> {
  const { data } = await api.get('/api/safe-spots/nearest', {
    params: { lat, lng, radius_km: radiusKm },
  })
  return data
}

export async function sendBuddyAlert(payload: BuddyAlertPayload) {
  const { data } = await api.post('/api/buddy-alert', payload)
  return data
}

export default api
