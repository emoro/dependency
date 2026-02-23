import { useRef, useEffect, useState, useMemo } from 'react'
import Slider from '@mui/material/Slider'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MapboxOverlay } from '@deck.gl/mapbox'
import { ScatterplotLayer } from '@deck.gl/layers'
import { BOSTON_CENTER, REF_ZOOM } from './mapConfig'
import { SIDEBAR_CONTAINER_STYLE, SIDEBAR_SECTION_STYLE, SIDEBAR_LABEL_STYLE } from './theme'

// Supported simulation scenarios and their data sources
const SIMULATION_CONFIGS = {
  airports: {
    id: 'airports',
    label: 'Airports',
    closedUrl: '/airports_poi.json',
    impactUrl: '/airports_impact.json',
    preprocessCmd: 'Rscript scripts/preprocess_airports.R',
  },
  colleges: {
    id: 'colleges',
    label: 'Colleges',
    closedUrl: '/colleges_poi.json',
    impactUrl: '/colleges_impact.json',
    preprocessCmd: 'Rscript scripts/preprocess_colleges.R',
  },
}

const POI_BASE_RADIUS_M = 28
const CLOSED_RADIUS_M = 40
const IMPACT_FLOOR = -100 // data is already in %; treat any impact < -100 as -100%

const NUM_IMPACT_QUANTILES = 6

// OrRd-style palette (R ColorBrewer OrRd), reversed: Red (-100%, high impact) → Yellow (-0%, low impact).
// 6 steps for 6 quantiles: dark red → red → orange → light orange → cream → yellow.
const IMPACT_PALETTE_ORRD = [
  [127, 0, 0],      // #7F0000 dark red (bin 0, -100%)
  [215, 48, 31],    // #D7301F red
  [252, 141, 89],   // #FC8D59 orange
  [253, 212, 158],  // #FDD49E light orange
  [254, 230, 206],  // #FEE6CE lighter
  [255, 247, 236],  // #FFF7EC cream / very light yellow (bin 5, -0%)
]
const IMPACT_PALETTE_ALPHA = 220

function clampImpact(v) {
  const n = Number(v)
  if (Number.isNaN(n)) return n
  return Math.max(n, IMPACT_FLOOR)
}

/** Quantile scale (like d3.scaleQuantile): compute domain thresholds at 1/6, 2/6, ..., 5/6 of sorted impacts. */
function getImpactQuantileBoundaries(impactPois) {
  const impacts = impactPois
    .map((p) => clampImpact(p.impact))
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b)
  const n = impacts.length
  if (n === 0) return []
  return [1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6].map((p) => impacts[Math.min(Math.floor(p * n), n - 1)])
}

/** Quantile scale: map impact to bin index 0..5 (like d3 scaleQuantile.range()). More negative => 0 (red), less negative => 5 (yellow). */
function getImpactQuantileIndex(impact, boundaries) {
  if (boundaries.length === 0) return 0
  const v = clampImpact(impact)
  if (Number.isNaN(v)) return 0
  for (let i = 0; i < boundaries.length; i++) {
    if (v <= boundaries[i]) return i
  }
  return NUM_IMPACT_QUANTILES - 1
}

/** Color from quantile index 0..5: direct lookup in OrRd palette (Red at 0, Yellow at 5). */
function impactQuantileToColor(quantileIndex) {
  const i = Math.max(0, Math.min(quantileIndex, IMPACT_PALETTE_ORRD.length - 1))
  const [r, g, b] = IMPACT_PALETTE_ORRD[i]
  return [r, g, b, IMPACT_PALETTE_ALPHA]
}

function poiRadiusMeters(zoom) {
  const scale = Math.pow(2, (zoom - REF_ZOOM) / 1.2)
  return Math.max(2, POI_BASE_RADIUS_M * scale)
}

function closedRadiusMeters(zoom) {
  const scale = Math.pow(2, (zoom - REF_ZOOM) / 1.2)
  return Math.max(3, CLOSED_RADIUS_M * scale)
}

const TOOLTIP_STYLE = {
  padding: '12px 14px',
  borderRadius: 10,
  backgroundColor: 'rgba(28, 28, 32, 0.96)',
  color: '#e8e8e8',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  fontSize: '13px',
  lineHeight: 1.4,
  maxWidth: 280,
  boxShadow: '0 8px 28px rgba(0, 0, 0, 0.4)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  pointerEvents: 'none',
}

function escapeHtml(s) {
  const div = document.createElement('div')
  div.textContent = s
  return div.innerHTML
}

function buildSimulationTooltip(object, closedIds, impactExtent, simulationId) {
  if (!object) return null
  const isClosed = closedIds.has(object.id)
  if (isClosed) {
    if (simulationId === 'colleges') {
      return {
        html: `
          <div style="font-weight: 600; color: #f0f0f0; margin-bottom: 4px;">College</div>
          <div style="font-size: 12px; color: #b8b8b8;">- 50% visits</div>
        `,
        style: TOOLTIP_STYLE,
      }
    }
    return {
      html: `
        <div style="font-weight: 600; color: #f0f0f0; margin-bottom: 4px;">Closed</div>
        <div style="font-size: 12px; color: #a0a0a0;">${escapeHtml(String(object.category ?? '—'))}</div>
      `,
      style: TOOLTIP_STYLE,
    }
  }
  const impact = clampImpact(object.impact)
  const impactStr = typeof impact === 'number' && !Number.isNaN(impact)
    ? impact.toFixed(2) + '%'
    : '—'
  return {
    html: `
      <div style="font-weight: 600; color: #f0f0f0; margin-bottom: 6px;">${escapeHtml(String(object.category ?? '—'))}</div>
      <div style="font-size: 12px; color: #b8b8b8;">
        <span style="color: #888;">Impact:</span> ${impactStr}
      </div>
    `,
    style: TOOLTIP_STYLE,
  }
}

function buildSimulationLayers(closedPois, impactPois, impactQuantileBoundaries, zoom) {
  const layers = []
  const impactRadius = poiRadiusMeters(zoom)
  const closedRadius = closedRadiusMeters(zoom)

  if (impactPois && impactPois.length > 0 && impactQuantileBoundaries.length > 0) {
    layers.push(
      new ScatterplotLayer({
        id: 'impact-pois',
        data: impactPois,
        getPosition: (d) => d.position,
        getRadius: impactRadius,
        getFillColor: (d) => impactQuantileToColor(getImpactQuantileIndex(d.impact, impactQuantileBoundaries)),
        getLineColor: [255, 255, 255, 120],
        getLineWidth: 1,
        radiusMinPixels: 2,
        radiusMaxPixels: 14,
        lineWidthMinPixels: 1,
        pickable: true,
      })
    )
  }

  if (closedPois && closedPois.length > 0) {
    layers.push(
      new ScatterplotLayer({
        id: 'closed-pois',
        data: closedPois,
        getPosition: (d) => d.position,
        getRadius: closedRadius,
        getFillColor: [93, 212, 255, 255],
        getLineColor: [255, 255, 255, 200],
        getLineWidth: 2,
        radiusMinPixels: 3,
        radiusMaxPixels: 18,
        lineWidthMinPixels: 2,
        pickable: true,
      })
    )
  }

  return layers
}

function SimulationSidebar({
  taxonomyOptions,
  selectedTaxonomies,
  onToggleTaxonomy,
  onClear,
  impactExtent,
  impactRange,
  onImpactRangeChange,
  simulationId,
  onSimulationChange,
}) {
  const maxCount = taxonomyOptions.length ? Math.max(...taxonomyOptions.map((x) => x.count)) : 0
  const totalSelected = selectedTaxonomies.length
  const hasImpactSlider = impactExtent != null && impactRange != null && impactRange.length === 2

  const scenarioNote =
    simulationId === 'airports'
      ? 'Airports 100% closed'
      : simulationId === 'colleges'
      ? 'Colleges 50% attendance'
      : ''

  // p^0.01: more resolution near severe (negative) impact; inverse is t^100.
  const impactToSlider = (v) => {
    if (!impactExtent || impactExtent.length !== 2) return 0
    const [min, max] = impactExtent
    if (max === min) return 0
    const t = Math.max(0, Math.min(1, (v - min) / (max - min)))
    return Math.pow(t, 100)
  }

  const sliderToImpact = (p) => {
    if (!impactExtent || impactExtent.length !== 2) return 0
    const [min, max] = impactExtent
    const t = Math.max(0, Math.min(1, p))
    return min + (max - min) * Math.pow(t, 0.01)
  }

  const impactSliderValue = hasImpactSlider
    ? [impactToSlider(impactRange[0]), impactToSlider(impactRange[1])]
    : [0, 1]

  return (
    <div style={SIDEBAR_CONTAINER_STYLE}>
      <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 600, color: '#f0f0f0' }}>Filters</h3>

      <section style={SIDEBAR_SECTION_STYLE}>
        <div style={SIDEBAR_LABEL_STYLE}>Scenario</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { id: 'airports', label: 'Airports' },
            { id: 'colleges', label: 'Colleges' },
          ].map((opt) => {
            const active = simulationId === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSimulationChange && onSimulationChange(opt.id)}
                style={{
                  padding: '4px 10px',
                  fontSize: 12,
                  fontWeight: 500,
                  borderRadius: 999,
                  border: active ? '1px solid rgba(255,255,255,0.9)' : '1px solid rgba(255,255,255,0.3)',
                  background: active ? 'rgba(255,255,255,0.18)' : 'transparent',
                  color: active ? '#ffffff' : 'rgba(255,255,255,0.8)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
        {scenarioNote && (
          <p style={{ margin: '6px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
            {scenarioNote}
          </p>
        )}
      </section>

      {hasImpactSlider && (
        <section style={SIDEBAR_SECTION_STYLE}>
          <div style={SIDEBAR_LABEL_STYLE}>Impact</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '80%', margin: '0 auto' }}>
            <Slider
              value={impactSliderValue}
              onChange={(_, newValue) => {
                if (Array.isArray(newValue) && newValue.length === 2) {
                  const minGap = 0.01
                  let [a, b] = newValue
                  if (a > b - minGap) a = b - minGap
                  if (b < a + minGap) b = a + minGap
                  const vA = sliderToImpact(a)
                  const vB = sliderToImpact(b)
                  onImpactRangeChange([Math.min(vA, vB), Math.max(vA, vB)])
                }
              }}
              valueLabelDisplay="auto"
              valueLabelFormat={(p) => sliderToImpact(p).toFixed(1) + '%'}
              min={0}
              max={1}
              step={0.01}
              disableSwap
              size="small"
              sx={{
                mt: 1,
                mb: 0.5,
                width: '100%',
                color: 'rgb(127,59,141)',
                '& .MuiSlider-thumb': {
                  width: 16,
                  height: 16,
                  boxSizing: 'border-box',
                  backgroundColor: '#fff',
                  border: '2px solid rgb(127,59,141)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  '&:hover, &.Mui-focusVisible': {
                    boxShadow: '0 0 0 4px rgba(127,59,141,0.2)',
                  },
                },
              }}
            />
            {impactExtent && impactExtent.length === 2 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: 4, fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
                <span>{impactExtent[0].toFixed(1)}%</span>
                <span>{impactExtent[1].toFixed(1)}%</span>
              </div>
            )}
          </div>
        </section>
      )}

      <section style={{ ...SIDEBAR_SECTION_STYLE, marginBottom: 0 }}>
        <div style={SIDEBAR_LABEL_STYLE}>Place taxonomy</div>
        <p style={{ margin: '0 0 8px', fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
          Select the POI taxonomy you'd like to visualise
        </p>
        {taxonomyOptions.length === 0 ? (
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
            No points in the current view for these filters.
          </p>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
              <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                {totalSelected} selected
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={onClear}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    fontSize: 12,
                    color: '#1976d2',
                    textDecoration: 'underline',
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {taxonomyOptions.map(({ name, count }) => {
                const selected = selectedTaxonomies.includes(name)
                const pct = maxCount > 0 ? count / maxCount : 0
                return (
                  <div
                    key={name}
                    role="button"
                    tabIndex={0}
                    onClick={() => onToggleTaxonomy(name)}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onToggleTaxonomy(name)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      minHeight: 36,
                      cursor: 'pointer',
                      padding: '4px 0',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'nowrap', minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: selected ? '#f0f0f0' : 'rgba(255,255,255,0.85)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={name}
                      >
                        {name}
                      </span>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', flexShrink: 0, marginLeft: 8 }}>
                        {count.toLocaleString()}
                      </span>
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: 8,
                        borderRadius: 2,
                        overflow: 'hidden',
                        background: 'rgba(255,255,255,0.15)',
                      }}
                    >
                      <div
                        style={{
                          width: `${pct * 100}%`,
                          height: '100%',
                          background: selected ? '#22c55e' : 'rgba(255,255,255,0.35)',
                          borderRadius: 2,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </section>
    </div>
  )
}

function getBoundsFromPois(closedPois, impactPois) {
  let minLon = Infinity
  let minLat = Infinity
  let maxLon = -Infinity
  let maxLat = -Infinity
  const add = (p) => {
    const [lon, lat] = Array.isArray(p.position) ? p.position : [NaN, NaN]
    if (!Number.isNaN(lon) && !Number.isNaN(lat)) {
      minLon = Math.min(minLon, lon)
      minLat = Math.min(minLat, lat)
      maxLon = Math.max(maxLon, lon)
      maxLat = Math.max(maxLat, lat)
    }
  }
  closedPois.forEach(add)
  impactPois.forEach(add)
  if (minLon === Infinity) return null
  return [[minLon, minLat], [maxLon, maxLat]]
}

export default function SimulationMap({ sharedZoom = 10, onSharedZoomChange }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const overlayRef = useRef(null)
  const hasFittedBoundsRef = useRef(false)
  /** Latest overlay props (layers + getTooltip) so we can apply them when overlay is created after data has already loaded */
  const latestOverlayPropsRef = useRef(null)
  const [closedPois, setClosedPois] = useState([])
  const [impactPois, setImpactPois] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [zoom, setZoom] = useState(sharedZoom)
  const [viewBounds, setViewBounds] = useState(null) // [[minLon,minLat],[maxLon,maxLat]]
  const [simulationId, setSimulationId] = useState('airports')
  const dataCacheRef = useRef({}) // { [simulationId]: { closedPois, impactPois } }

  const impactExtent = useMemo(() => {
    if (!impactPois.length) return null
    let min = Infinity
    let max = -Infinity
    impactPois.forEach((p) => {
      const v = clampImpact(p.impact)
      if (!Number.isNaN(v)) {
        min = Math.min(min, v)
        max = Math.max(max, v)
      }
    })
    return min === Infinity ? null : [min, max]
  }, [impactPois])

  const closedIds = useMemo(() => new Set(closedPois.map((p) => p.id)), [closedPois])

  const [selectedTaxonomies, setSelectedTaxonomies] = useState([])
  const [impactRange, setImpactRange] = useState([]) // [minImpact, maxImpact] in %

  // Taxonomy-only filter: used for quantile scale so colors stay fixed when the impact slider moves.
  const impactPoisForQuantiles = useMemo(() => {
    if (selectedTaxonomies.length === 0) return impactPois
    const set = new Set(selectedTaxonomies)
    return impactPois.filter((p) => {
      const t = p.taxonomy != null ? String(p.taxonomy).trim() : ''
      const key = t || '(Uncategorized)'
      return set.has(key)
    })
  }, [impactPois, selectedTaxonomies])

  // Quantile scale (same as color scale): 5 bins from impact data
  const impactQuantileBoundaries = useMemo(
    () => getImpactQuantileBoundaries(impactPoisForQuantiles),
    [impactPoisForQuantiles]
  )

  // Initialize full impact range when extent is known
  useEffect(() => {
    if (impactExtent && impactExtent.length === 2 && impactRange.length === 0) {
      setImpactRange([...impactExtent])
    }
  }, [impactExtent, impactRange.length])

  // POIs in current impact range only (no taxonomy filter yet).
  const impactPoisInRange = useMemo(() => {
    if (impactRange.length !== 2) return impactPois
    const [lo, hi] = impactRange
    return impactPois.filter((p) => {
      const v = clampImpact(p.impact)
      if (Number.isNaN(v)) return true
      return v >= lo && v <= hi
    })
  }, [impactPois, impactRange])

  // POIs within both the current impact range and current map view (viewport)
  const impactPoisInRangeAndView = useMemo(() => {
    if (!impactPoisInRange.length) return impactPoisInRange
    if (!viewBounds) return impactPoisInRange
    const [[minLon, minLat], [maxLon, maxLat]] = viewBounds
    return impactPoisInRange.filter((p) => {
      const [lon, lat] = Array.isArray(p.position) ? p.position : [NaN, NaN]
      if (Number.isNaN(lon) || Number.isNaN(lat)) return false
      return lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat
    })
  }, [impactPoisInRange, viewBounds])

  // Taxonomy counts reflect only POIs currently in view and within the impact range
  const taxonomyOptions = useMemo(() => {
    const byTax = new Map()
    impactPoisInRangeAndView.forEach((p) => {
      const t = p.taxonomy != null ? String(p.taxonomy).trim() : ''
      const key = t || '(Uncategorized)'
      byTax.set(key, (byTax.get(key) ?? 0) + 1)
    })
    return [...byTax.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [impactPoisInRangeAndView])

  const filteredImpactPois = useMemo(() => {
    let list = impactPoisForQuantiles
    if (impactRange.length === 2) {
      const [lo, hi] = impactRange
      list = list.filter((p) => {
        const v = clampImpact(p.impact)
        if (Number.isNaN(v)) return true
        return v >= lo && v <= hi
      })
    }
    return list
  }, [impactPoisForQuantiles, impactRange])

  const impactExtentFiltered = useMemo(() => {
    if (!filteredImpactPois.length) return impactExtent
    let min = Infinity
    let max = -Infinity
    filteredImpactPois.forEach((p) => {
      const v = clampImpact(p.impact)
      if (!Number.isNaN(v)) {
        min = Math.min(min, v)
        max = Math.max(max, v)
      }
    })
    return min === Infinity ? impactExtent : [min, max]
  }, [filteredImpactPois, impactExtent])

  const toggleTaxonomy = (name) => {
    setSelectedTaxonomies((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]
    )
  }

  useEffect(() => {
    const config = SIMULATION_CONFIGS[simulationId] ?? SIMULATION_CONFIGS.airports
    const cached = dataCacheRef.current[simulationId]

    if (cached) {
      setClosedPois(cached.closedPois)
      setImpactPois(cached.impactPois)
      setError(null)
      setLoading(false)
      setSelectedTaxonomies([])
      setImpactRange([])
      return
    }

    setLoading(true)
    setError(null)
    setClosedPois([])
    setImpactPois([])
    setSelectedTaxonomies([])
    setImpactRange([])

    Promise.all([
      fetch(config.closedUrl).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      }),
      fetch(config.impactUrl).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      }),
    ])
      .then(([closed, impact]) => {
        const closedList = Array.isArray(closed) ? closed : []
        const impactList = Array.isArray(impact) ? impact : []
        dataCacheRef.current[simulationId] = { closedPois: closedList, impactPois: impactList }
        setClosedPois(closedList)
        setImpactPois(impactList)
        setError(null)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [simulationId])

  useEffect(() => {
    const container = document.getElementById('map-simulation')
    if (!container) return

    const map = new maplibregl.Map({
      container: 'map-simulation',
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: BOSTON_CENTER,
      zoom: sharedZoom,
    })

    mapRef.current = map

    map.once('load', () => {
      try {
        map.setPaintProperty('background', 'background-color', '#000000')
      } catch (_) {}
      const currentZoom = map.getZoom()
      setZoom(currentZoom)
      if (onSharedZoomChange) onSharedZoomChange(currentZoom)
      setViewBounds(map.getBounds().toArray())
      const overlay = new MapboxOverlay({
        interleaved: true,
        layers: [],
        getTooltip: () => null,
      })
      map.addControl(overlay)
      overlayRef.current = overlay
      // Apply latest layers immediately (data may have already loaded before map 'load' fired)
      const props = latestOverlayPropsRef.current
      if (props) {
        overlay.setProps(props)
        map.triggerRepaint()
      }
    })

    const updateView = () => {
      const z = map.getZoom()
      setZoom(z)
      if (onSharedZoomChange) onSharedZoomChange(z)
      const b = map.getBounds()
      if (b) setViewBounds(b.toArray())
    }
    map.on('zoomend', updateView)
    map.on('moveend', updateView)

    return () => {
      map.off('zoomend', updateView)
      map.off('moveend', updateView)
      overlayRef.current = null
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const props = {
      layers: buildSimulationLayers(closedPois, filteredImpactPois, impactQuantileBoundaries, zoom),
      getTooltip: ({ object }) => buildSimulationTooltip(object, closedIds, impactExtentFiltered, simulationId),
    }
    latestOverlayPropsRef.current = props
    if (overlayRef.current) {
      overlayRef.current.setProps(props)
      if (map) map.triggerRepaint()
    }
  }, [closedPois, impactPois, filteredImpactPois, impactExtent, impactExtentFiltered, impactQuantileBoundaries, closedIds, zoom, simulationId])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', backgroundColor: '#000' }}
        id="map-simulation"
      />
      {!loading && !error && (closedPois.length > 0 || impactPois.length > 0) && (
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            zIndex: 5,
            padding: '8px 12px',
            background: 'rgba(28, 28, 32, 0.92)',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.12)',
            fontSize: 11,
            color: 'rgba(255,255,255,0.9)',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <div style={{ fontWeight: 600 }}>Impact</div>
          <div
            style={{
              width: 120,
              height: 8,
              borderRadius: 2,
              background: `linear-gradient(to right, rgb(127,0,0), rgb(215,48,31), rgb(252,141,89), rgb(253,212,158), rgb(255,247,236))`,
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', width: 120 }}>
            <span>High</span>
            <span>Low</span>
          </div>
        </div>
      )}
      {loading && (
        <div
          style={{
            position: 'absolute',
            top: 72,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '8px 16px',
            background: 'rgba(28,28,32,0.95)',
            color: '#e8e8e8',
            borderRadius: 8,
            fontSize: 14,
          }}
        >
          Loading simulation…
        </div>
      )}
      {error && (
        <div
          style={{
            position: 'absolute',
            top: 72,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '8px 16px',
            background: '#3d2020',
            borderRadius: 8,
            color: '#f88',
            fontSize: 14,
          }}
        >
          {error}. Run:{' '}
          {(SIMULATION_CONFIGS[simulationId] ?? SIMULATION_CONFIGS.airports).preprocessCmd} (see
          README for details).
        </div>
      )}
      {!loading && !error && (closedPois.length > 0 || impactPois.length > 0) && (
        <SimulationSidebar
          taxonomyOptions={taxonomyOptions}
          selectedTaxonomies={selectedTaxonomies}
          onToggleTaxonomy={toggleTaxonomy}
          onClear={() => setSelectedTaxonomies([])}
          impactExtent={impactExtent}
          impactRange={impactRange}
          onImpactRangeChange={setImpactRange}
          simulationId={simulationId}
          onSimulationChange={setSimulationId}
        />
      )}
    </div>
  )
}
