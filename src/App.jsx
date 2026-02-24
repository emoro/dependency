import { useState } from 'react'
import { NAV_BG } from './theme'
import NetworkMap from './NetworkMap'
import SimulationMap from './SimulationMap'
import AppNav from './AppNav'
import LandingPage from './LandingPage'

export default function App() {
  const [showLanding, setShowLanding] = useState(true)
  const [story, setStory] = useState('network')
  // Shared zoom level between Network and Simulation maps so switching tabs preserves view
  // Initial zoom level (10) for both tabs.
  const [sharedZoom, setSharedZoom] = useState(10)
  // Whether we've already auto-opened the Methods modal once per tab
  const [hasShownNetworkMethodsOnce, setHasShownNetworkMethodsOnce] = useState(false)
  const [hasShownSimulationMethodsOnce, setHasShownSimulationMethodsOnce] = useState(false)

  const shouldShowNetworkMethods = !hasShownNetworkMethodsOnce && story === 'network'
  const shouldShowSimulationMethods = !hasShownSimulationMethodsOnce && story === 'simulation'
  const initialModalId = shouldShowNetworkMethods || shouldShowSimulationMethods ? 'methods' : null

  const baseUrl = typeof window !== 'undefined' ? window.location.href : ''
  const encodedUrl = encodeURIComponent(baseUrl)
  const shareText = encodeURIComponent('Explore the Invisible Urban Dependencies map')
  const xShareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${shareText}`
  const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
  const blueskyShareUrl = `https://bsky.app/intent/compose?text=${encodeURIComponent(
    'Explore the Invisible Urban Dependencies map: '
  )}${encodedUrl}`

  const shareIconSize = 18
  const shareIconStyle = { display: 'block', width: shareIconSize, height: shareIconSize }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ flex: 1, minHeight: 0, width: '100%' }}>
        {showLanding ? (
          <LandingPage onStart={() => setShowLanding(false)} />
        ) : (
          <>
            <AppNav
              story={story}
              setStory={setStory}
              onGoHome={() => setShowLanding(true)}
              initialModalId={initialModalId}
              onInitialModalShown={() => {
                if (story === 'network') setHasShownNetworkMethodsOnce(true)
                if (story === 'simulation') setHasShownSimulationMethodsOnce(true)
              }}
            />
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  visibility: story === 'network' ? 'visible' : 'hidden',
                  pointerEvents: story === 'network' ? 'auto' : 'none',
                }}
              >
                <NetworkMap sharedZoom={sharedZoom} onSharedZoomChange={setSharedZoom} />
              </div>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  visibility: story === 'simulation' ? 'visible' : 'hidden',
                  pointerEvents: story === 'simulation' ? 'auto' : 'none',
                }}
              >
                <SimulationMap sharedZoom={sharedZoom} onSharedZoomChange={setSharedZoom} />
              </div>
            </div>
          </>
        )}
      </div>
      {!showLanding && (
        <footer
          style={{
            background: NAV_BG,
            boxShadow: '0 -1px 0 rgba(255,255,255,0.06)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 16px',
              maxWidth: 1200,
              margin: '0 auto',
              gap: 12,
            }}
          >
            <a
              href="https://socialurban.net"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                minWidth: 0,
                textDecoration: 'none',
              }}
            >
              <img
                src={`${import.meta.env.BASE_URL}images/sunlab.png`}
                alt="SUNLab - Social Urban Networks"
                style={{ height: 18, width: 'auto', flexShrink: 0 }}
              />
              <span
                style={{
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.8)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                Social Urban Networks Lab (SUNLab)
              </span>
            </a>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                fontSize: 11,
              }}
            >
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>Share:</span>
              <a
                href={xShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Share on X"
                style={{ color: '#fff', textDecoration: 'none', lineHeight: 0 }}
              >
                <svg style={shareIconStyle} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href={linkedInShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Share on LinkedIn"
                style={{ color: '#fff', textDecoration: 'none', lineHeight: 0 }}
              >
                <svg style={shareIconStyle} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
              <a
                href={blueskyShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Share on Bluesky"
                style={{ color: '#fff', textDecoration: 'none', lineHeight: 0 }}
              >
                <svg style={shareIconStyle} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M3.468 1.948C5.303 3.325 7.276 6.118 8 7.616c.725-1.498 2.698-4.29 4.532-5.668C13.855.955 16 .186 16 2.632c0 .489-.28 4.105-.444 4.692-.572 2.04-2.653 2.561-4.504 2.246 3.236.551 4.06 2.375 2.281 4.2-3.376 3.464-4.852-.87-5.23-1.98-.07-.204-.103-.3-.103-.218 0-.081-.033.014-.102.218-.379 1.11-1.855 5.444-5.231 1.98-1.778-1.825-.955-3.65 2.28-4.2-1.85.315-3.932-.205-4.503-2.246C.28 6.737 0 3.12 0 2.632 0 .186 2.145.955 3.468 1.948" transform="scale(1.5, 1.5)" />
                </svg>
              </a>
              <a
                href={facebookShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Share on Facebook"
                style={{ color: '#fff', textDecoration: 'none', lineHeight: 0 }}
              >
                <svg style={shareIconStyle} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
            </div>
          </div>
        </footer>
      )}
    </div>
  )
}
