import { useState, useEffect } from 'react'
import { NAV_BG, NAV_ACTIVE } from './theme'

const STORIES = [
  { id: 'network', label: 'Dependency network' },
  { id: 'simulation', label: 'Simulations' },
]

const NAV_ITEMS = [
  { id: 'methods', label: 'Methods' },
  { id: 'research', label: 'Research' },
  { id: 'about', label: 'About' },
]

const MODAL_CONTENT = {
  map: {
    title: 'Map',
    body: 'This interactive map shows dependency networks between points of interest (POIs) in the Boston metropolitan area. Links represent behavior-based dependencies derived from mobility data. Colors indicate dependency strength (quantile from low to high: purple, burgundy, red, orange, yellow). Use the filters to explore by dependency level and distance, and click a POI to focus on its connections.',
  },
  methods: { title: 'Methods', body: null },
  research: { title: 'Research', body: null },
  simulations: {
    title: 'Simulations',
    body: 'Simulation studies allow us to explore cascading effects of disruptions across the dependency network. By modeling scenarios such as the closure of key nodes or changes in travel behavior, we can anticipate impacts on other locations and test strategies for fostering more resilient urban systems. Results from these simulations inform the dependency metrics shown on the map.',
  },
  about: { title: 'About this story map', body: null },
}

function MethodsModalContent() {
  const titleBlue = '#1565c0'
  return (
    <div style={{ fontSize: 15, lineHeight: 1.6, color: '#333' }}>
      <h2 style={{ margin: '0 0 0.75em', fontSize: 22, fontWeight: 700, color: titleBlue }}>
        Mapping Place-to-Place Dependencies
      </h2>
      <p style={{ margin: '0 0 1em' }}>
        How do places depend on each other? The dependency network between places is constructed using large-scale mobility data, capturing real-world movement patterns of millions of anonymous users between points of interest (POIs) across major U.S. cities. Two places depend on each other if they are visited sequentially by individuals within a specific time frame:
      </p>
      <div style={{ textAlign: 'center', margin: '1.25em 0' }}>
        <img
          src={`${import.meta.env.BASE_URL}images/methods.png`}
          alt="Diagram: The restaurant depends on the office: 18% of its visitors also visit the office."
          style={{ maxWidth: '60%', height: 'auto' }}
        />
      </div>
      <p style={{ margin: '0 0 1em' }}>
        This approach identifies how different locations are linked through shared visitors, offering a more accurate measure of economic interdependence than traditional proximity-based methods. For example, restaurants and cafes visits often depend on nearby office buildings for foot traffic, while gas stations that are far away may rely on commuters to those offices or transportation hubs depend on offices; entertainment venues depend on college students. As you can see in the visualization, dependencies between POIs span short and long distances, highlighting key sites, such as hospitals, colleges, shopping centers, and airports, and hold influence well beyond their immediate surroundings.
      </p>
    </div>
  )
}

function SimulationMethodsModalContent() {
  const titleBlue = '#1565c0'
  return (
    <div style={{ fontSize: 15, lineHeight: 1.6, color: '#333' }}>
      <h2 style={{ margin: '0 0 0.75em', fontSize: 22, fontWeight: 700, color: titleBlue }}>
        Simulation Methods
      </h2>
      <p style={{ margin: '0 0 1em' }}>
        Using the dependency network, we can examine how shocks propagate across urban areas. When a disruption — such as a natural disaster, a public health crisis, or a shift in consumer behavior — affects one point of interest (POI), the impact on visitation often spreads far beyond that location. By simulating these cascades, we can trace how reduced foot traffic at one node ripples through the network, revealing indirect and sometimes unexpected dependencies.
      </p>
      <div style={{ textAlign: 'center', margin: '1.25em 0' }}>
        <img
          src={`${import.meta.env.BASE_URL}images/methods_simulations.png`}
          alt="Diagram: Through the dependency network, shocks in one place (blue) propagate to distant places."
          style={{ maxWidth: '60%', height: 'auto' }}
        />
      </div>
      <p style={{ margin: '0 0 1em' }}>
        During the COVID-19 pandemic, for example, travel bans sharply <b>reduced airport traffic</b>. The effects extended well beyond nearby businesses, impacting retail stores, hotels, convention centers, and other venues that indirectly rely on national and international visitors. Similarly, <b>declines in college attendance</b> can reduce visits not only to nearby cafés and bookstores, but also to transit hubs, museums, and entertainment venues across the metropolitan area.

      </p>
      <p style={{ margin: '0 0 1em' }}>
        The visualization shows how reductions in airport or college (blue dots) activity affect business foot traffic in the Boston area (colored by percentage decrease in visits), highlighting how these critical anchors influence places far beyond their immediate surroundings. 
      </p>
      <p style={{ margin: '0 0 1em' }}>This approach helps cities better prepare for disruptions, ensuring that essential services and local businesses adapt and thrive in changing circumstances.</p>
    </div>
  )
}

function ResearchModalContent() {
  const linkStyle = { color: '#1976d2', textDecoration: 'none' }
  return (
    <div style={{ fontSize: 15, lineHeight: 1.6, color: '#333' }}>
      <p style={{ margin: '0 0 1em' }}>
        This story map is based on our research on behavioral-dependency networks in urban areas in the US recently published in Nature Human Behavior:
      </p>
      <p style={{ margin: 0, paddingLeft: 16, borderLeft: '3px solid #ddd', fontStyle: 'italic' }}>
        <em>Behavior-based dependency networks between places shape urban economic resilience.</em> Yabe, T., Garcia-Bulle, B., Frank, M., Pentland, A., & Moro, E. Nature Human Behavior (2024).{' '}
        <a href="https://doi.org/10.1038/s41562-024-02072-7" target="_blank" rel="noopener noreferrer" style={linkStyle}>
          [link]
        </a>
      </p>
    </div>
  )
}

function AboutModalContent() {
  const linkStyle = { color: '#1976d2', textDecoration: 'none' }
  const emailIconStyle = { fontSize: 20, verticalAlign: 'middle', marginLeft: 2 }
  const teamImgStyle = { maxHeight: 88, width: 'auto', display: 'block', margin: '0 auto 4px' }
  const cellStyle = { padding: '4px 6px', verticalAlign: 'top', textAlign: 'center' }
  const nameStyle = { margin: 0, fontSize: 12, lineHeight: 1.35 }
  return (
    <div style={{ fontSize: 15, lineHeight: 1.6, color: '#333' }}>
      <p style={{ margin: '0 0 1em' }}>
        This story map and the research supporting it is a project from the{' '}
        <a href="https://socialurban.net" target="_blank" rel="noopener noreferrer" style={linkStyle}>
          Social Urban Network (SUNLab)
        </a>{' '}
        group at the Network Science Institute, Northeastern University, in collaboration with the NYU Tandon School of Engineering, the MIT, and the University of Pittsburgh.
      </p>
      <h2 style={{ margin: '1.5em 0 0.5em', fontSize: 18, fontWeight: 700, color: '#1F2232' }}>Research Team</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 4 }}>
        <tbody>
          <tr>
            <td style={cellStyle}>
              <img src={`${import.meta.env.BASE_URL}images/about-esteban-moro.jpg`} alt="Esteban Moro" style={teamImgStyle} />
              <p style={nameStyle}>
                Esteban Moro{' '}
                <a href="mailto:e.moroegido@northeastern.edu" style={linkStyle} title="Email"><span style={emailIconStyle}>✉</span></a>
                <br />Northeastern
              </p>
            </td>
            <td style={cellStyle}>
              <img src={`${import.meta.env.BASE_URL}images/about-takahiro-yabe.jpg`} alt="Takahiro Yabe" style={teamImgStyle} />
              <p style={nameStyle}>
                Takahiro Yabe{' '}
                <a href="mailto:takahiroyabe@nyu.edu" style={linkStyle} title="Email"><span style={emailIconStyle}>✉</span></a>
                <br />NYU
              </p>
            </td>
          </tr>
          <tr>
            <td style={cellStyle}>
              <img src={`${import.meta.env.BASE_URL}images/about-bernardo.png`} alt="Bernardo García" style={teamImgStyle} />
              <p style={nameStyle}>Bernardo García<br /><strong>MIT</strong></p>
            </td>
            <td style={cellStyle}>
              <img src={`${import.meta.env.BASE_URL}images/about-morgan.jpg`} alt="Morgan Frank" style={teamImgStyle} />
              <p style={nameStyle}>Morgan Frank<br /><strong>University of Pittsburgh</strong></p>
            </td>
            <td style={cellStyle}>
              <img src={`${import.meta.env.BASE_URL}images/about-alex-pentland.png`} alt="Alex Pentland" style={teamImgStyle} />
              <p style={nameStyle}>Sandy Pentland<br /><strong>MIT</strong></p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export default function AppNav({ story, setStory, onGoHome, initialModalId, onInitialModalShown }) {
  const [openModalId, setOpenModalId] = useState(null)

  // Auto-open a modal (Methods) the first time the dependency network is shown
  useEffect(() => {
    if (initialModalId && !openModalId) {
      setOpenModalId(initialModalId)
      if (onInitialModalShown) onInitialModalShown()
    }
  }, [initialModalId, openModalId, onInitialModalShown])

  const content = openModalId ? MODAL_CONTENT[openModalId] : null

  return (
    <>
      <nav
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 56,
          paddingLeft: 20,
          paddingRight: 20,
          background: NAV_BG,
          boxShadow: '0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 16 }}
        >
          <button
            type="button"
            onClick={onGoHome}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              font: 'inherit',
              fontSize: 16,
              fontWeight: 700,
              background:
                'linear-gradient(90deg, rgb(127,59,141) 0%, rgb(158,42,99) 20%, rgb(227,26,28) 40%, rgb(246,132,0) 60%, rgb(253,194,0) 80%, rgb(255,255,180) 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
            aria-label="Go back to home"
          >
            Invisible Urban Dependencies
          </button>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {STORIES.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setStory(id)}
                style={{
                  padding: '6px 12px',
                  fontSize: 13,
                  fontWeight: 500,
                  color: story === id ? NAV_ACTIVE : 'rgba(255,255,255,0.85)',
                  background: story === id ? 'rgba(255,255,255,0.1)' : 'transparent',
                  border:
                    '1px solid ' +
                    (story === id ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.2)'),
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {NAV_ITEMS.map(({ id, label, active }) => (
            <button
              key={id}
              type="button"
              onClick={() => setOpenModalId(id)}
              style={{
                padding: '8px 14px',
                fontSize: 14,
                fontWeight: 500,
                color: active ? NAV_ACTIVE : '#fff',
                textDecoration: 'none',
                borderBottom: active ? `2px solid ${NAV_ACTIVE}` : '2px solid transparent',
                background: 'none',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>
      {content && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
            }}
            onClick={() => setOpenModalId(null)}
            aria-hidden
          />
          <div
            style={{
              position: 'relative',
              maxWidth: openModalId === 'about' || openModalId === 'methods' ? 720 : 480,
              maxHeight: '80vh',
              overflow: 'auto',
              background: '#fff',
              borderRadius: 12,
              boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
              padding: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
              <h2 id="modal-title" style={{ margin: 0, fontSize: 20, fontWeight: 700, color: NAV_BG }}>
                {content.title}
              </h2>
              <button
                type="button"
                onClick={() => setOpenModalId(null)}
                aria-label="Close"
                style={{
                  padding: 4,
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: 24,
                  lineHeight: 1,
                  color: '#666',
                }}
              >
                ×
              </button>
            </div>
            {openModalId === 'about' ? (
              <div style={{ marginTop: 16 }}>
                <AboutModalContent />
              </div>
            ) : openModalId === 'methods' ? (
              <div style={{ marginTop: 16 }}>
                {story === 'network' ? (
                  <MethodsModalContent />
                ) : (
                  <SimulationMethodsModalContent />
                )}
              </div>
            ) : openModalId === 'research' ? (
              <div style={{ marginTop: 16 }}>
                <ResearchModalContent />
              </div>
            ) : (
              <p style={{ margin: '16px 0 0', fontSize: 15, lineHeight: 1.6, color: '#333' }}>
                {content.body}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  )
}
