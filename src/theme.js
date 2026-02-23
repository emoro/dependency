// Shared UI theme tokens (colors and common styles)

export const NAV_BG = '#1F2232'
export const NAV_ACTIVE = '#DD8223'

// Base container style for right-hand sidebars (filters)
export const SIDEBAR_CONTAINER_STYLE = {
  position: 'absolute',
  top: 72,
  right: 16,
  width: 220,
  maxHeight: 'calc(100vh - 88px)',
  overflow: 'auto',
  background: 'rgba(28, 28, 32, 0.96)',
  borderRadius: 10,
  boxShadow: '0 6px 24px rgba(0,0,0,0.4)',
  border: '1px solid rgba(255,255,255,0.08)',
  padding: 16,
  zIndex: 10,
  pointerEvents: 'auto',
}

export const SIDEBAR_SECTION_STYLE = {
  marginBottom: 14,
  padding: '10px 12px',
  background: 'rgba(255,255,255,0.06)',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.1)',
}

export const SIDEBAR_LABEL_STYLE = {
  fontSize: 11,
  fontWeight: 700,
  color: 'rgba(255,255,255,0.6)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: 8,
}

