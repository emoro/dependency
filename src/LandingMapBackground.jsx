import { useRef, useEffect, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MapboxOverlay } from '@deck.gl/mapbox'
import { ArcLayer, ScatterplotLayer } from '@deck.gl/layers'
import { BOSTON_CENTER, REF_ZOOM } from './mapConfig'

const LANDING_MAP_CENTER = [-71.11, 42.36]
const DATA_URL = `${import.meta.env.BASE_URL}boston_network_landing.json`
const ARC_BASE_WIDTH_PX = 0.9
const POI_BASE_RADIUS_M = 24

function arcWidthPixels(zoom) {
  const scale = Math.pow(2, (zoom - REF_ZOOM) / 1.2)
  return Math.max(1, Math.min(3, ARC_BASE_WIDTH_PX * scale))
}

function poiRadiusMeters(zoom) {
  return Math.max(1, POI_BASE_RADIUS_M * Math.pow(2, (zoom - REF_ZOOM) / 1.0))
}

const NUM_QUANTILES = 5
const DEP_PALETTE = [
  [127, 59, 141],
  [158, 42, 99],
  [227, 26, 28],
  [246, 132, 0],
  [253, 194, 0],
  [255, 255, 180],
]
const DEP_PALETTE_ALPHA = 200
const LANDING_FRAME_INTERVAL_MS = 42
const LANDING_PAUSE_WHEN_HIDDEN = true

function getQuantileBoundaries(arcs) {
  const deps = arcs.map((a) => Number(a.dep)).filter((n) => !Number.isNaN(n)).sort((a, b) => a - b)
  const n = deps.length
  if (n === 0) return []
  return [0.2, 0.4, 0.6, 0.8].map((p) => deps[Math.min(Math.floor(p * n), n - 1)])
}

function getQuantile(dep, boundaries) {
  if (boundaries.length === 0) return 1
  const d = Number(dep)
  if (Number.isNaN(d)) return 1
  for (let i = 0; i < boundaries.length; i++) {
    if (d <= boundaries[i]) return i + 1
  }
  return NUM_QUANTILES
}

function lerpRgb(a, b, f) {
  return [
    Math.round(a[0] + f * (b[0] - a[0])),
    Math.round(a[1] + f * (b[1] - a[1])),
    Math.round(a[2] + f * (b[2] - a[2])),
  ]
}

function quantileToColor(q) {
  const t = Math.max(0, Math.min(1, (q - 1) / (NUM_QUANTILES - 1)))
  const i = t * (DEP_PALETTE.length - 1)
  const i0 = Math.floor(i)
  const i1 = Math.min(i0 + 1, DEP_PALETTE.length - 1)
  const f = i - i0
  const [r, g, b] = lerpRgb(DEP_PALETTE[i0], DEP_PALETTE[i1], f)
  return [r, g, b, DEP_PALETTE_ALPHA]
}

function buildLandingLayers(arcs, zoom = 10) {
  const list = Array.isArray(arcs) ? arcs : []
  const quantileBoundaries = getQuantileBoundaries(list)
  const shortPois = list.length > 0
    ? (() => {
        const byId = new Map()
        list.forEach((a) => {
          if (a.poi_a && a.sourcePosition) byId.set(a.poi_a, { id: a.poi_a, position: a.sourcePosition })
          if (a.poi_b && a.targetPosition) byId.set(a.poi_b, { id: a.poi_b, position: a.targetPosition })
        })
        return [...byId.values()]
      })()
    : []

  const layers = []
  const linkWidthPx = arcWidthPixels(zoom)
  const poiRadius = poiRadiusMeters(zoom)
  const noDepthTest = { depthTest: false, depthMask: false }

  if (list.length > 0) {
    layers.push(
      new ArcLayer({
        id: 'landing-arcs',
        data: list,
        getSourcePosition: (d) => d.sourcePosition,
        getTargetPosition: (d) => d.targetPosition,
        getSourceColor: (d) => quantileToColor(getQuantile(d.dep, quantileBoundaries)),
        getTargetColor: (d) => quantileToColor(getQuantile(d.dep, quantileBoundaries)),
        getWidth: linkWidthPx,
        getHeight: 1,
        getTilt: 15,
        pickable: false,
        widthUnits: 'pixels',
        widthMinPixels: linkWidthPx,
        widthMaxPixels: linkWidthPx,
        parameters: noDepthTest,
      })
    )
  }

  if (shortPois.length > 0) {
    layers.push(
      new ScatterplotLayer({
        id: 'landing-pois',
        data: shortPois,
        getPosition: (d) => d.position,
        getRadius: () => poiRadius,
        getFillColor: () => [255, 255, 255, 255],
        getLineColor: () => [255, 255, 255, 200],
        getLineWidth: () => 1,
        radiusMinPixels: 1,
        radiusMaxPixels: 12,
        lineWidthMinPixels: 1,
        pickable: false,
        parameters: noDepthTest,
      })
    )
  }

  return layers
}

export default function LandingMapBackground() {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const overlayRef = useRef(null)
  const animationRef = useRef(null)
  const arcsRef = useRef([])
  const poisRef = useRef([])
  const layersUpdatedRef = useRef(false)
  const [arcs, setArcs] = useState([])
  const [pois, setPois] = useState([])

  arcsRef.current = arcs
  poisRef.current = pois

  useEffect(() => {
    fetch(DATA_URL)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : []
        setArcs(list)
        const byId = new Map()
        list.forEach((a) => {
          if (a.poi_a && a.sourcePosition)
            byId.set(a.poi_a, { id: a.poi_a, position: a.sourcePosition })
          if (a.poi_b && a.targetPosition)
            byId.set(a.poi_b, { id: a.poi_b, position: a.targetPosition })
        })
        setPois([...byId.values()])
      })
      .catch(() => setArcs([]))
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const map = new maplibregl.Map({
      container,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: LANDING_MAP_CENTER,
      zoom: 11,
      bearing: 0,
      pitch: 28,
      interactive: false,
      scrollZoom: false,
      dragPan: false,
      dragRotate: false,
      doubleClickZoom: false,
      touchZoomRotate: false,
      touchPitch: false,
      keyboard: false,
      boxZoom: false,
    })

    mapRef.current = map

    map.once('load', () => {
      try {
        map.setPaintProperty('background', 'background-color', '#0a0a0f')
      } catch (_) {}
      const initialArcs = arcsRef.current
      const hasData = initialArcs.length > 0
      if (hasData) layersUpdatedRef.current = true
      const overlay = new MapboxOverlay({
        interleaved: false,
        layers: buildLandingLayers(initialArcs, 11),
      })
      map.addControl(overlay)
      overlayRef.current = overlay

      const flightDurationMs = 20000
      const startZoom = 11
      const endZoom = 13
      const startPitch = 28
      const endPitch = 58
      const startTime = performance.now()
      let lastFrameTime = 0
      let finished = false

      const smoothstep = (x) => x * x * (3 - 2 * x)
      const animate = (now) => {
        if (!mapRef.current) return
        if (finished) return
        if (LANDING_PAUSE_WHEN_HIDDEN && document.visibilityState === 'hidden') {
          animationRef.current = requestAnimationFrame(animate)
          return
        }
        if (now - lastFrameTime < LANDING_FRAME_INTERVAL_MS) {
          animationRef.current = requestAnimationFrame(animate)
          return
        }
        lastFrameTime = now
        const m = mapRef.current
        const elapsed = performance.now() - startTime
        if (elapsed >= flightDurationMs) {
          m.setZoom(endZoom)
          m.setPitch(endPitch)
          m.setCenter(LANDING_MAP_CENTER)
          finished = true
          return
        }
        const t = elapsed / flightDurationMs
        const eased = smoothstep(t)
        const zoom = startZoom + (endZoom - startZoom) * eased
        const pitch = startPitch + (endPitch - startPitch) * eased
        m.setZoom(zoom)
        m.setPitch(pitch)
        m.setCenter(LANDING_MAP_CENTER)
        animationRef.current = requestAnimationFrame(animate)
      }
      animationRef.current = requestAnimationFrame(animate)
    })

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      overlayRef.current = null
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!overlayRef.current || arcs.length === 0) return
    if (layersUpdatedRef.current) return
    layersUpdatedRef.current = true
    overlayRef.current.setProps({ layers: buildLandingLayers(arcs, 11) })
  }, [arcs])

  return (
    <div
      ref={containerRef}
      id="landing-map"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        width: '100%',
        height: '100%',
        minHeight: '100%',
        backgroundColor: '#0a0a0f',
      }}
    />
  )
}
