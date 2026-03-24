/// <reference types="vite/client" />

declare module 'leaflet.heat' {
  import * as L from 'leaflet'
  
  interface HeatLayerOptions {
    radius?: number
    blur?: number
    minOpacity?: number
    maxZoom?: number
    max?: number
    gradient?: Record<number, string>
  }
  
  function heatLayer(
    latlngs: Array<[number, number, number?]>,
    options?: HeatLayerOptions
  ): L.Layer

  export = heatLayer
}

declare module '*.png' {
  const value: string
  export default value
}
