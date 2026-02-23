import { useRef, useEffect, useState, useMemo } from 'react'
import Slider from '@mui/material/Slider'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Checkbox from '@mui/material/Checkbox'
import ListItemText from '@mui/material/ListItemText'
import FormControl from '@mui/material/FormControl'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MapboxOverlay } from '@deck.gl/mapbox'
import { LineLayer, ScatterplotLayer } from '@deck.gl/layers'
import { BOSTON_CENTER, REF_ZOOM } from './mapConfig'
import { SIDEBAR_CONTAINER_STYLE, SIDEBAR_SECTION_STYLE, SIDEBAR_LABEL_STYLE } from './theme'
const DATA_URL = '/boston_network.json'
const ZOOM_SCALE_DIVISOR = 1.2 // smaller = stronger shrink at low zoom
const POI_ZOOM_SCALE_DIVISOR = 1.0 // steeper: POIs shrink more at small zooms
const POI_BASE_RADIUS_M = 32
const POI_BASE_RADIUS_SELECTED_M = 56
const ARC_BASE_WIDTH_PX = 0.9
const INTERMEDIATE_ZOOM_MIN = 9
const INTERMEDIATE_ZOOM_MAX = 12
const INTERMEDIATE_WIDTH_FACTOR = 0.2 // 80% smaller in intermediate zoom range

function zoomScale(zoom) {
  return Math.pow(2, (zoom - REF_ZOOM) / ZOOM_SCALE_DIVISOR)
}

function intermediateZoomFactor(zoom) {
  if (zoom >= INTERMEDIATE_ZOOM_MAX) return 1
  if (zoom <= INTERMEDIATE_ZOOM_MIN) return 1
  if (zoom < INTERMEDIATE_ZOOM_MIN + 0.5) {
    return 1 + ((zoom - INTERMEDIATE_ZOOM_MIN) / 0.5) * (INTERMEDIATE_WIDTH_FACTOR - 1)
  }
  if (zoom > INTERMEDIATE_ZOOM_MAX - 0.5) {
    return INTERMEDIATE_WIDTH_FACTOR + ((zoom - (INTERMEDIATE_ZOOM_MAX - 0.5)) / 0.5) * (1 - INTERMEDIATE_WIDTH_FACTOR)
  }
  return INTERMEDIATE_WIDTH_FACTOR
}

function poiRadiusMeters(zoom, selected) {
  const base = selected ? POI_BASE_RADIUS_SELECTED_M : POI_BASE_RADIUS_M
  const scale = Math.pow(2, (zoom - REF_ZOOM) / POI_ZOOM_SCALE_DIVISOR)
  return Math.max(1, base * scale)
}

/** Single link width in pixels for the current zoom; same for every arc and every view at that zoom. */
function arcWidthPixels(zoom) {
  const scale = zoomScale(zoom)
  const base = Math.max(0.8, Math.min(3, ARC_BASE_WIDTH_PX * scale))
  return Math.max(1, base * intermediateZoomFactor(zoom))
}

const NUM_QUANTILES = 5

// Sequential palette (deck.gl / CARTO PurpOr style): dark purple → burgundy → red → orange → yellow
const DEP_PALETTE = [
  [127, 59, 141],   // 1. dark purple / maroon
  [158, 42, 99],   // 2. burgundy
  [227, 26, 28],   // 3. vivid red
  [246, 132, 0],   // 4. orange-red
  [253, 194, 0],   // 5. golden orange
  [255, 255, 180], // 6. bright yellow
]
const DEP_PALETTE_ALPHA = 120

/** Compute quantile boundaries (4 values) so dep <= b[i] => quantile i+1. From sorted deps at 20%, 40%, 60%, 80%. */
function getQuantileBoundaries(arcs) {
  const deps = arcs.map((a) => Number(a.dep)).filter((n) => !Number.isNaN(n)).sort((a, b) => a - b)
  const n = deps.length
  if (n === 0) return []
  return [0.2, 0.4, 0.6, 0.8].map((p) => deps[Math.min(Math.floor(p * n), n - 1)])
}

/** Assign quantile 1..5 from dep and boundaries. */
function getQuantile(dep, boundaries) {
  if (boundaries.length === 0) return 1
  const d = Number(dep)
  if (Number.isNaN(d)) return 1
  for (let i = 0; i < boundaries.length; i++) {
    if (d <= boundaries[i]) return i + 1
  }
  return NUM_QUANTILES
}

/** Interpolate between two RGB arrays; f in [0,1]. */
function lerpRgb(a, b, f) {
  return [
    Math.round(a[0] + f * (b[0] - a[0])),
    Math.round(a[1] + f * (b[1] - a[1])),
    Math.round(a[2] + f * (b[2] - a[2])),
  ]
}

/** Color from quantile 1..5: proportional to position in 6-step sequential palette. */
function quantileToColor(q) {
  const t = Math.max(0, Math.min(1, (q - 1) / (NUM_QUANTILES - 1)))
  const i = t * (DEP_PALETTE.length - 1)
  const i0 = Math.floor(i)
  const i1 = Math.min(i0 + 1, DEP_PALETTE.length - 1)
  const f = i - i0
  const [r, g, b] = lerpRgb(DEP_PALETTE[i0], DEP_PALETTE[i1], f)
  return [r, g, b, DEP_PALETTE_ALPHA]
}

function buildLayers(arcs, pois, selectedPoiId, zoom = REF_ZOOM, quantileBoundaries = []) {
  const layers = []
  const linkWidthPx = arcWidthPixels(zoom)

  if (arcs && arcs.length > 0) {
    layers.push(
      new LineLayer({
        id: 'poi-links',
        data: arcs,
        getSourcePosition: (d) => d.sourcePosition,
        getTargetPosition: (d) => d.targetPosition,
        getColor: (d) => quantileToColor(getQuantile(d.dep, quantileBoundaries)),
        getWidth: linkWidthPx,
        pickable: true,
        widthUnits: 'pixels',
        widthMinPixels: linkWidthPx,
        widthMaxPixels: linkWidthPx,
      })
    )
  }

  if (pois && pois.length > 0) {
    layers.push(
      new ScatterplotLayer({
        id: 'pois',
        data: pois,
        getPosition: (d) => d.position,
        getRadius: (d) => poiRadiusMeters(zoom, d.id === selectedPoiId),
        getFillColor: (d) => (d.id === selectedPoiId ? [255, 255, 200, 255] : [255, 255, 255, 255]),
        getLineColor: (d) => (d.id === selectedPoiId ? [255, 230, 150, 255] : [255, 255, 255, 200]),
        getLineWidth: (d) => (d.id === selectedPoiId ? 2 : 1),
        radiusMinPixels: 1,
        radiusMaxPixels: 16,
        lineWidthMinPixels: 1,
        pickable: true,
      })
    )
  }

  return layers
}

const MIN_THUMB_GAP_FRACTION = 0.02

const SLIDER_TRACK_HEIGHT = 10

function DoubleRangeSlider({ minBound, maxBound, value, defaultValue, onChange, step = 0.01, format = (v) => v.toFixed(2), sx = {}, minGap: minGapProp }) {
  const range = maxBound - minBound || 1
  const minGap = minGapProp !== undefined ? minGapProp : Math.max(step, range * MIN_THUMB_GAP_FRACTION)
  const isControlled = value !== undefined

  const handleChange = (event, newValue, activeThumb) => {
    if (!Array.isArray(newValue) || newValue.length < 2) {
      onChange(event, newValue)
      return
    }
    const [a, b] = newValue
    const left = Math.min(a, b)
    const right = Math.max(a, b)
    if (minGap > 0 && right - left < minGap) {
      if (activeThumb === 0) {
        onChange([Math.max(minBound, right - minGap), right])
      } else {
        onChange([left, Math.min(maxBound, left + minGap)])
      }
    } else {
      onChange([left, right])
    }
  }

  return (
    <Slider
      {...(isControlled ? { value } : { defaultValue: defaultValue ?? [minBound, maxBound] })}
      onChange={handleChange}
      valueLabelDisplay="auto"
      valueLabelFormat={format}
      getAriaLabel={() => 'Range'}
      min={minBound}
      max={maxBound}
      step={step}
      disableSwap
      size="small"
      sx={{
        mt: 1,
        mb: 0.5,
        '& .MuiSlider-rail': {
          height: SLIDER_TRACK_HEIGHT,
          borderRadius: SLIDER_TRACK_HEIGHT / 2,
          opacity: 1,
        },
        '& .MuiSlider-track': {
          height: SLIDER_TRACK_HEIGHT,
          borderRadius: SLIDER_TRACK_HEIGHT / 2,
        },
        ...sx,
      }}
    />
  )
}

const DEP_SLIDER_MIN = 0
const DEP_SLIDER_MAX = 5

const TOOLTIP_STYLE = {
  padding: '12px 14px',
  borderRadius: 10,
  backgroundColor: 'rgba(28, 28, 32, 0.96)',
  color: '#e8e8e8',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  fontSize: '13px',
  lineHeight: 1.4,
  maxWidth: 280,
  boxShadow: '0 8px 28px rgba(0, 0, 0, 0.4), 0 2px 10px rgba(0, 0, 0, 0.25)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  pointerEvents: 'none',
}

function buildTooltipContent(object, quantileBoundaries) {
  if (!object) return null
  if (object.category != null) {
    return {
      html: `
        <div style="font-weight: 600; color: #f0f0f0; margin-bottom: 6px; font-size: 14px;">${escapeHtml(String(object.category))}</div>
        <div style="color: #a0a0a0; font-size: 12px;">Click to show only links to/from this POI</div>
      `,
      style: TOOLTIP_STYLE,
    }
  }
  const q = getQuantile(object.dep, quantileBoundaries)
  const dist = object.distance != null && !Number.isNaN(object.distance) ? Number(object.distance).toFixed(2) : '—'
  const origin = escapeHtml(String(object.cat_a ?? '—'))
  const dest = escapeHtml(String(object.cat_b ?? '—'))
  return {
    html: `
      <div style="font-weight: 600; color: #f0f0f0; margin-bottom: 8px; font-size: 13px;">${origin} → ${dest}</div>
      <div style="display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #b8b8b8;">
        <span><span style="color: #888;">Strength:</span> Q${q}</span>
        <span><span style="color: #888;">Distance:</span> ${dist} km</span>
      </div>
    `,
    style: TOOLTIP_STYLE,
  }
}

function escapeHtml(s) {
  const div = document.createElement('div')
  div.textContent = s
  return div.innerHTML
}

function FilterSidebar({ quantileExtent, quantileRange, onQuantileRangeChange, distanceExtent, distanceRange, onDistanceRangeChange, taxonomyOptions, originTaxonomies, onOriginTaxonomyChange, destinationTaxonomies, onDestinationTaxonomyChange }) {
  const [minDist, maxDist] = distanceExtent
  const selectSx = { fontSize: 12, '& .MuiSelect-select': { py: 0.75 } }
  const renderTaxonomyValue = (v) => (v.length === 0 ? 'All' : v.length === 1 ? v[0] : `${v.length} selected`)

  const depSliderValue = [quantileRange[0] - 1, quantileRange[1]]
  const handleDepChange = (_, newValue) => {
    if (!Array.isArray(newValue) || newValue.length !== 2) return
    const [a, b] = newValue
    const left = Math.min(a, b)
    const right = Math.max(a, b)
    onQuantileRangeChange([left + 1, right === left ? left + 1 : right])
  }

  const depRailStops = []
  for (let i = 0; i < NUM_QUANTILES; i++) {
    const c = quantileToColor(i + 1)
    const rgb = `rgb(${c[0]},${c[1]},${c[2]})`
    const startPct = (i / NUM_QUANTILES) * 100
    const endPct = ((i + 1) / NUM_QUANTILES) * 100
    depRailStops.push(`${rgb} ${startPct}%`, `${rgb} ${endPct}%`)
  }
  const depRailGradient = `linear-gradient(90deg, ${depRailStops.join(', ')})`
  const darkSelectSx = {
    ...selectSx,
    color: '#e8e8e8',
    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.25)' },
    '& .MuiSelect-select': { color: '#e8e8e8' },
    '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.6)' },
  }
  const darkMenuProps = {
    PaperProps: {
      sx: {
        maxHeight: 220,
        bgcolor: 'rgb(38, 38, 42)',
        color: '#e8e8e8',
        '& .MuiMenuItem-root': { color: '#e8e8e8' },
        '& .MuiListItemText-primary': { color: '#e8e8e8' },
        '& .MuiCheckbox-root': { color: 'rgba(255,255,255,0.5)' },
        '& .MuiCheckbox-root.Mui-checked': { color: 'rgb(127,59,141)' },
      },
    },
  }

  return (
    <div
      style={{ ...SIDEBAR_CONTAINER_STYLE, width: 260 }}
    >
      <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 600, color: '#f0f0f0' }}>
        Filters
      </h3>

      <section style={SIDEBAR_SECTION_STYLE}>
        <div style={SIDEBAR_LABEL_STYLE}>Strength</div>
        <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '80%', margin: '0 auto' }}>
        <Slider
          getAriaLabel={() => 'Dependency strength range'}
          value={depSliderValue}
          onChange={handleDepChange}
          valueLabelDisplay="auto"
          valueLabelFormat={(v) => `${v}`}
          getAriaValueText={(v) => `${v}`}
          min={DEP_SLIDER_MIN}
          max={DEP_SLIDER_MAX}
          step={1}
          disableSwap
          track={false}
          size="small"
          sx={{
            mt: 1,
            mb: 0.5,
            width: '100%',
            '& .MuiSlider-rail': {
              background: depRailGradient,
              opacity: 1,
              height: 8,
              borderRadius: 4,
            },
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
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: 4, fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
          <span>low</span>
          <span>high</span>
        </div>
        </div>
      </fieldset>
      </section>

      <section style={SIDEBAR_SECTION_STYLE}>
        <div style={SIDEBAR_LABEL_STYLE}>Distance</div>
        <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '80%', margin: '0 auto' }}>
        <DoubleRangeSlider
          minBound={minDist}
          maxBound={maxDist}
          value={distanceRange}
          onChange={onDistanceRangeChange}
          step={0.1}
          format={(v) => v.toFixed(1) + ' km'}
          sx={{
            width: '100%',
            '& .MuiSlider-rail': { height: 8, borderRadius: 4 },
            '& .MuiSlider-track': { height: 8, borderRadius: 4 },
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
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: 4, fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
          <span>0km</span>
          <span>10km</span>
          <span>20km</span>
          <span>30km</span>
        </div>
        </div>
      </fieldset>
      </section>

      {taxonomyOptions != null && taxonomyOptions.length > 0 && (
        <section style={{ ...SIDEBAR_SECTION_STYLE, marginBottom: 0 }}>
          <div style={SIDEBAR_LABEL_STYLE}>Place category</div>
          <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.75)', marginBottom: 6 }}>Places in</div>
              <FormControl size="small" fullWidth variant="outlined" sx={darkSelectSx}>
                <Select
                  id="origin-taxonomy-select"
                  multiple
                  value={originTaxonomies}
                  onChange={(e) => onOriginTaxonomyChange(e.target.value)}
                  displayEmpty
                  renderValue={renderTaxonomyValue}
                  sx={darkSelectSx}
                  MenuProps={darkMenuProps}
                >
                  {taxonomyOptions.map((tax) => (
                    <MenuItem key={`origin-${tax}`} value={tax}>
                      <Checkbox checked={originTaxonomies.indexOf(tax) > -1} size="small" />
                      <ListItemText primary={tax} primaryTypographyProps={{ fontSize: 12 }} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.75)', marginBottom: 6 }}>Depend on places in</div>
              <FormControl size="small" fullWidth variant="outlined" sx={darkSelectSx}>
                <Select
                  id="destination-taxonomy-select"
                  multiple
                  value={destinationTaxonomies}
                  onChange={(e) => onDestinationTaxonomyChange(e.target.value)}
                  displayEmpty
                  renderValue={renderTaxonomyValue}
                  sx={darkSelectSx}
                  MenuProps={darkMenuProps}
                >
                  {taxonomyOptions.map((tax) => (
                    <MenuItem key={`dest-${tax}`} value={tax}>
                      <Checkbox checked={destinationTaxonomies.indexOf(tax) > -1} size="small" />
                      <ListItemText primary={tax} primaryTypographyProps={{ fontSize: 12 }} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>
          </div>
        </fieldset>
        </section>
      )}
    </div>
  )
}

export default function NetworkMap({ sharedZoom = 9, onSharedZoomChange }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const overlayRef = useRef(null)
  const arcsRef = useRef([])
  const [arcs, setArcs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const depQuantileBoundaries = useMemo(() => getQuantileBoundaries(arcs), [arcs])
  const quantileExtent = [1, NUM_QUANTILES]

  const distanceExtent = useMemo(() => {
    if (!arcs.length) return [0, 30]
    let dMin = Infinity
    let dMax = -Infinity
    arcs.forEach((a) => {
      const d = Number(a.distance)
      if (!Number.isNaN(d)) {
        dMin = Math.min(dMin, d)
        dMax = Math.max(dMax, d)
      }
    })
    return [dMin === Infinity ? 0 : dMin, dMax === -Infinity ? 30 : Math.ceil(dMax)]
  }, [arcs])

  const taxonomyOptions = useMemo(() => {
    const set = new Set()
    arcs.forEach((a) => {
      const ta = a.taxonomy_a
      const tb = a.taxonomy_b
      if (ta != null && String(ta).trim() !== '') set.add(String(ta).trim())
      if (tb != null && String(tb).trim() !== '') set.add(String(tb).trim())
    })
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [arcs])

  const [quantileRange, setQuantileRange] = useState([1, NUM_QUANTILES])
  const [distanceRange, setDistanceRange] = useState([0, 30])
  const [originTaxonomies, setOriginTaxonomies] = useState([])
  const [destinationTaxonomies, setDestinationTaxonomies] = useState([])

  const uniquePois = useMemo(() => {
    const byId = new Map()
    arcs.forEach((a) => {
      if (a.poi_a && a.sourcePosition)
        byId.set(a.poi_a, { id: a.poi_a, position: a.sourcePosition, category: a.cat_a })
      if (a.poi_b && a.targetPosition)
        byId.set(a.poi_b, { id: a.poi_b, position: a.targetPosition, category: a.cat_b })
    })
    return [...byId.values()]
  }, [arcs])

  const [selectedPoiId, setSelectedPoiId] = useState(null)
  const [zoom, setZoom] = useState(sharedZoom)

  const filteredArcs = useMemo(() => {
    if (!arcs.length) return []
    let list = arcs.filter((a) => {
      const q = getQuantile(a.dep, depQuantileBoundaries)
      if (q < quantileRange[0] || q > quantileRange[1]) return false
      const d = Number(a.distance)
      if (Number.isNaN(d)) return true
      return d >= distanceRange[0] && d <= distanceRange[1]
    })
    if (originTaxonomies.length > 0) {
      list = list.filter((a) => {
        const ta = a.taxonomy_a != null ? String(a.taxonomy_a).trim() : ''
        return originTaxonomies.includes(ta)
      })
    }
    if (destinationTaxonomies.length > 0) {
      list = list.filter((a) => {
        const tb = a.taxonomy_b != null ? String(a.taxonomy_b).trim() : ''
        return destinationTaxonomies.includes(tb)
      })
    }
    if (selectedPoiId != null) {
      list = list.filter((a) => a.poi_a === selectedPoiId || a.poi_b === selectedPoiId)
    }
    return list
  }, [arcs, depQuantileBoundaries, quantileRange, distanceRange, originTaxonomies, destinationTaxonomies, selectedPoiId])

  const onClickRef = useRef(null)
  onClickRef.current = (info) => {
    if (info?.object?.id != null) {
      setSelectedPoiId((prev) => (prev === info.object.id ? null : info.object.id))
    } else {
      setSelectedPoiId(null)
    }
  }

  arcsRef.current = arcs
  arcsRef.current.filtered = filteredArcs
  arcsRef.current.uniquePois = uniquePois
  arcsRef.current.selectedPoiId = selectedPoiId
  arcsRef.current.zoom = zoom
  arcsRef.current.quantileBoundaries = depQuantileBoundaries

  useEffect(() => {
    fetch(DATA_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : []
        setArcs(list)
        setError(null)
        if (list.length) {
          let minD = Infinity
          let maxD = -Infinity
          list.forEach((a) => {
            const d = Number(a.distance)
            if (!Number.isNaN(d)) {
              minD = Math.min(minD, d)
              maxD = Math.max(maxD, d)
            }
          })
          setQuantileRange([1, NUM_QUANTILES])
          setDistanceRange([minD === Infinity ? 0 : minD, maxD === -Infinity ? 30 : Math.ceil(maxD)])
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const container = document.getElementById('map')
    if (!container) return

    const map = new maplibregl.Map({
      container: 'map',
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
      const overlay = new MapboxOverlay({
        interleaved: true,
        layers: buildLayers(
          arcsRef.current.filtered || [],
          arcsRef.current.uniquePois || [],
          arcsRef.current.selectedPoiId,
          arcsRef.current.zoom ?? 10,
          arcsRef.current.quantileBoundaries || []
        ),
        getTooltip: ({ object }) => buildTooltipContent(object, arcsRef.current.quantileBoundaries || []),
        onClick: (info) => {
          if (onClickRef.current) onClickRef.current(info)
        },
      })
      map.addControl(overlay)
      overlayRef.current = overlay
    })

    let zoomThrottleId = null
    const ZOOM_UPDATE_INTERVAL_MS = 80
    const onZoom = () => {
      if (zoomThrottleId != null) return
      zoomThrottleId = setTimeout(() => {
        zoomThrottleId = null
        const z = map.getZoom()
        setZoom(z)
        if (onSharedZoomChange) onSharedZoomChange(z)
      }, ZOOM_UPDATE_INTERVAL_MS)
    }
    const onZoomEnd = () => {
      if (zoomThrottleId != null) {
        clearTimeout(zoomThrottleId)
        zoomThrottleId = null
      }
      const z = map.getZoom()
      setZoom(z)
      if (onSharedZoomChange) onSharedZoomChange(z)
    }
    map.on('zoom', onZoom)
    map.on('zoomend', onZoomEnd)

    return () => {
      if (zoomThrottleId != null) clearTimeout(zoomThrottleId)
      map.off('zoom', onZoom)
      map.off('zoomend', onZoomEnd)
      overlayRef.current = null
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.setProps({
        layers: buildLayers(filteredArcs, uniquePois, selectedPoiId, zoom, depQuantileBoundaries),
        getTooltip: ({ object }) => buildTooltipContent(object, depQuantileBoundaries),
        onClick: (info) => {
          if (onClickRef.current) onClickRef.current(info)
        },
      })
    }
  }, [filteredArcs, uniquePois, selectedPoiId, zoom, depQuantileBoundaries])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', backgroundColor: '#000' }}
        id="map"
      />
      {loading && (
        <div
          style={{
            position: 'absolute',
            top: 72,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '8px 16px',
            background: 'rgba(255,255,255,0.95)',
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            fontSize: 14,
          }}
        >
          Loading network…
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
            background: '#fee',
            borderRadius: 8,
            color: '#c00',
            fontSize: 14,
          }}
        >
          {error}. Run: Rscript scripts/preprocess_network.R (see README for details).
        </div>
      )}
      {!loading && !error && arcs.length > 0 && (
        <>
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
            <div style={{ fontWeight: 600 }}>Dependency strength</div>
            <div
              style={{
                width: 120,
                height: 8,
                borderRadius: 2,
                background: `linear-gradient(to right, rgb(127,59,141), rgb(158,42,99), rgb(227,26,28), rgb(246,132,0), rgb(253,194,0), rgb(255,255,180))`,
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', width: 120 }}>
              <span>Low</span>
              <span>High</span>
            </div>
          </div>
          <FilterSidebar
            quantileExtent={quantileExtent}
            quantileRange={quantileRange}
            onQuantileRangeChange={setQuantileRange}
            distanceExtent={distanceExtent}
            distanceRange={distanceRange}
            onDistanceRangeChange={setDistanceRange}
            taxonomyOptions={taxonomyOptions}
            originTaxonomies={originTaxonomies}
            onOriginTaxonomyChange={setOriginTaxonomies}
            destinationTaxonomies={destinationTaxonomies}
            onDestinationTaxonomyChange={setDestinationTaxonomies}
          />
        </>
      )}
    </div>
  )
}
