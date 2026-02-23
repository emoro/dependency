import { useState } from 'react'
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

  return (
    <div style={{ width: '100%', height: '100%' }}>
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
              <SimulationMap sharedZoom={sharedZoom} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
