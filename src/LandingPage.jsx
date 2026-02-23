import LandingMapBackground from './LandingMapBackground'

const textShadow = '0 0 24px rgba(0,0,0,0.95), 0 1px 4px rgba(0,0,0,0.9), 0 2px 8px rgba(0,0,0,0.7)'

const contentStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 2,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'flex-start',
  padding: 'clamp(1rem, 3vw, 2rem)',
  maxWidth: 520,
  pointerEvents: 'none',
}

const contentInnerStyle = {
  pointerEvents: 'auto',
  background: 'rgba(0,0,0,0.5)',
  padding: 'clamp(1rem, 3vw, 1.5rem)',
  borderRadius: 12,
  maxWidth: '100%',
  maxHeight: 'min(85vh, 100%)',
  overflowY: 'auto',
}

const titleStyle = {
  margin: 0,
  fontSize: 'clamp(1.35rem, 4vw, 1.85rem)',
  fontWeight: 700,
  color: '#fff',
  letterSpacing: '-0.02em',
  lineHeight: 1.2,
  textShadow,
}

const headingStyle = {
  margin: '0.35rem 0 0',
  fontSize: 'clamp(0.85rem, 2vw, 1rem)',
  fontWeight: 500,
  color: 'rgba(255,255,255,0.95)',
  lineHeight: 1.35,
  textShadow,
}

const paragraphStyle = {
  margin: '0.65rem 0 0',
  fontSize: 'clamp(0.8rem, 1.5vw, 0.9rem)',
  color: 'rgba(255,255,255,0.95)',
  lineHeight: 1.5,
  textShadow,
}

const buttonStyle = {
  marginTop: '1rem',
  padding: '0.5rem 1.1rem',
  fontSize: '0.9rem',
  fontWeight: 600,
  color: '#fff',
  backgroundColor: '#1976d2',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.4rem',
  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
}

const attributionStyle = {
  marginTop: 'auto',
  paddingTop: '1rem',
  fontSize: '0.7rem',
  color: 'rgba(255,255,255,0.85)',
  textShadow,
}

const logoRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
  marginTop: '0.5rem',
  flexWrap: 'wrap',
}

const logoImgStyle = {
  height: 36,
  width: 'auto',
  display: 'block',
  objectFit: 'contain',
}

const collaborationStyle = {
  marginTop: '0.75rem',
  fontSize: '0.7rem',
  color: 'rgba(255,255,255,0.85)',
  textShadow,
}

const nyuRowStyle = {
  marginTop: '0.35rem',
}

const shadowOverlayStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 1,
  background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.5) 20%, rgba(0,0,0,0.4) 45%, rgba(0,0,0,0.25) 75%, rgba(0,0,0,0.15) 100%)',
  pointerEvents: 'none',
}

export default function LandingPage({ onStart }) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <LandingMapBackground />
      <div style={shadowOverlayStyle} aria-hidden />
      <div style={contentStyle}>
        <div style={contentInnerStyle}>
          <h1 style={titleStyle}>Invisible Urban Dependencies</h1>
          <p style={headingStyle}>How human behavior shapes economic resilience in cities</p>
          <p style={paragraphStyle}>
            Places within cities are deeply interconnected, relying on each other through the flow of people and shared patronage, creating complex dependency networks between them. Leveraging large-scale mobility data, our research shows how businesses, amenities, and other urban points of interest (POIs) depend on each other, revealing connections that aren't always visible but have substantial economic impacts.
          </p>
          <p style={paragraphStyle}>
            By analyzing these behavior-based dependency networks, we demonstrate how changes in foot traffic to one location—whether from temporary closures or shifts in consumer behavior—can affect the resilience of surrounding and far-away businesses. The dashboard offers interactive insights into these patterns, enabling users to see the reach of these dependencies, anticipate cascading effects, and explore strategies for fostering resilient, robust, adaptable urban systems.
          </p>
          <button type="button" style={buttonStyle} onClick={onStart}>
            Start →
          </button>
          <div style={attributionStyle}>
            <div>A story map by SUNLab at Northeastern University</div>
            <div style={logoRowStyle}>
              <img src="/images/sunlab.png" alt="SUNLab - Social Urban Networks" style={logoImgStyle} />
            </div>
            <div style={collaborationStyle}>In collaboration with</div>
            <div style={nyuRowStyle}>
              <img src="/images/nyu.png" alt="NYU" style={logoImgStyle} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
