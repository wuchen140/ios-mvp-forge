import { useMemo, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import './App.css'

type ViewKey = 'deconstruct' | 'brief' | 'agents' | 'review'
type RunState = 'idle' | 'running' | 'done'

type UploadedFile = {
  id: string
  name: string
  kind: string
  size: string
}

const assetBase = import.meta.env.BASE_URL
const productImage = `${assetBase}competitor-workstation.jpg`
const phoneImage = `${assetBase}mobile-analysis.jpg`

const initialFiles: UploadedFile[] = [
  {
    id: 'ipa',
    name: 'competitor_build.ipa',
    kind: 'iOS installation package',
    size: '1.8 GB',
  },
  {
    id: 'tf',
    name: 'TestFlight invite or App Store ID',
    kind: 'Store metadata',
    size: 'Linked',
  },
  {
    id: 'video',
    name: 'iPhone playtest recording',
    kind: '12 min capture',
    size: '428 MB',
  },
]

const systemModules = [
  {
    title: 'System Entrances',
    value: 'Battle, hero growth, draw, event, shop',
    tone: 'blue',
  },
  {
    title: 'Economy Chain',
    value: 'Gold, stamina, shards, premium currency',
    tone: 'orange',
  },
  {
    title: 'Session Loop',
    value: '6-9 min first run, 90 sec pressure window',
    tone: 'green',
  },
  {
    title: 'Monetization Pressure',
    value: 'Chapter 3 gold gap, 80-pull safety net',
    tone: 'red',
  },
]

const economyRows = [
  ['Stamina', '1 point / 6 min', 'Controls session frequency'],
  ['Gold', 'Chapter 3 shortage', 'Creates upgrade bottleneck'],
  ['Draw ticket', '7 day event path', 'Pushes return cadence'],
  ['Hero shard', 'Duplicate conversion', 'Long-term collection pressure'],
]

const opportunities = [
  'Shorten first-day system exposure and keep only the battle loop visible.',
  'Replace hard pay pressure with clearer strategy goals and softer resource gates.',
  'Keep the 3-minute combat payoff, but delay heavy growth systems until retention is proven.',
  'Use a light 7-day test event before investing in a full live-ops calendar.',
]

const agents = [
  {
    name: 'Package Agent',
    job: 'Extract bundle structure, visible systems, store metadata, and asset hints.',
    status: 'Running',
    tone: 'blue',
  },
  {
    name: 'Market Agent',
    job: 'Read store page, reviews, ratings, complaints, and monetization signals.',
    status: 'Queued',
    tone: 'orange',
  },
  {
    name: 'Core Loop Agent',
    job: 'Convert the deconstruction into 10 sec, 30 sec, and 5 min loops.',
    status: 'Ready',
    tone: 'green',
  },
  {
    name: 'MVP Scope Agent',
    job: 'Split Must, Should, Later, and Never for the first playable build.',
    status: 'Ready',
    tone: 'green',
  },
  {
    name: 'Tech Agent',
    job: 'Estimate implementation cost and flag package-analysis blind spots.',
    status: 'Waiting',
    tone: 'red',
  },
  {
    name: 'Prototype Agent',
    job: 'Turn the approved scope into a playable prototype task list.',
    status: 'Waiting',
    tone: 'gray',
  },
]

const reviewFindings = [
  {
    label: 'Playable signal',
    copy: 'Players understand the battle feedback quickly and ask for another run.',
    tone: 'green',
  },
  {
    label: 'Main friction',
    copy: 'The growth screen appears too early and hides the real tactical promise.',
    tone: 'orange',
  },
  {
    label: 'Scope warning',
    copy: 'Building draw pools and live events now would mask the core validation risk.',
    tone: 'red',
  },
]

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function App() {
  const [activeView, setActiveView] = useState<ViewKey>('deconstruct')
  const [files, setFiles] = useState<UploadedFile[]>(initialFiles)
  const [runState, setRunState] = useState<RunState>('idle')
  const [selectedAgent, setSelectedAgent] = useState(0)

  const progress = useMemo(() => {
    if (runState === 'idle') return 0
    if (runState === 'running') return 71
    return 100
  }, [runState])

  function addFiles(fileList: FileList | null) {
    if (!fileList) return

    const nextFiles = Array.from(fileList).map((file) => ({
      id: `${file.name}-${file.lastModified}`,
      name: file.name,
      kind: file.name.endsWith('.ipa')
        ? 'iOS installation package'
        : 'Supporting material',
      size: formatSize(file.size),
    }))

    setFiles((current) => [...nextFiles, ...current])
    setRunState('idle')
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    addFiles(event.dataTransfer.files)
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    addFiles(event.target.files)
    event.target.value = ''
  }

  function startRun() {
    setRunState('running')
    window.setTimeout(() => setRunState('done'), 850)
  }

  function exportBrief() {
    const payload = {
      product: 'iOS Competitor Deconstruction MVP Brief',
      files: files.map((file) => file.name),
      hypothesis:
        'Keep the short-session combat payoff, reduce early system load, and validate retention with a lighter resource loop.',
      mustValidate: [
        'Players understand the first battle and growth goal within five minutes.',
        'A second run feels motivated without relying on heavy draw or event systems.',
        'The resource loop creates strategy, not frustration.',
      ],
      notInMvp: [
        'Full draw pool',
        'Guild systems',
        'Deep live-ops calendar',
        'Large hero roster',
      ],
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'ios-mvp-brief.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const activeAgent = agents[selectedAgent]

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Product navigation">
        <div className="brand">
          <span className="brand-mark">MF</span>
          <div>
            <strong>MVP Forge</strong>
            <small>iOS Game Lab</small>
          </div>
        </div>

        <nav className="nav-list">
          {[
            ['deconstruct', '00 Competitor Lab'],
            ['brief', '01 MVP Brief'],
            ['agents', '02 Agent Board'],
            ['review', '03 Review Room'],
          ].map(([key, label]) => (
            <button
              className={activeView === key ? 'nav-item active' : 'nav-item'}
              key={key}
              onClick={() => setActiveView(key as ViewKey)}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="sidebar-note">
          <small>Current pipeline</small>
          <strong>Package first, innovation second.</strong>
        </div>
      </aside>

      <section className="workspace">
        {activeView === 'deconstruct' && (
          <section className="screen deconstruct-screen">
            <header className="screen-header">
              <div>
                <p className="eyebrow">Competitor Deconstruction</p>
                <h1>iOS mobile game package lab</h1>
                <p className="lede">
                  Upload a competitor IPA, TestFlight link, store page, or
                  iPhone recording. The app turns those inputs into system maps,
                  economy notes, numeric clues, and innovation space.
                </p>
              </div>
              <button className="primary-action" onClick={startRun}>
                {runState === 'running' ? 'Running analysis' : 'Start analysis'}
              </button>
            </header>

            <div className="deconstruct-grid">
              <section className="panel upload-panel">
                <h2>Feed the competitor</h2>
                <p>
                  Primary input is the iOS installation package. Supporting
                  inputs improve confidence but do not replace the package.
                </p>

                <label
                  className="drop-zone"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    multiple
                    onChange={handleFileInput}
                    aria-label="Upload competitor package or supporting files"
                  />
                  <strong>Drop .ipa or supporting files</strong>
                  <span>or click to choose files from this machine</span>
                </label>

                <div className="file-stack">
                  {files.map((file) => (
                    <article className="file-row" key={file.id}>
                      <div>
                        <strong>{file.name}</strong>
                        <span>{file.kind}</span>
                      </div>
                      <small>{file.size}</small>
                    </article>
                  ))}
                </div>
              </section>

              <section className="panel system-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Extracted system map</h2>
                    <p>
                      Package Agent groups the visible economy, feature gates,
                      and session structure before any new design is invented.
                    </p>
                  </div>
                  <div className="progress-meter">
                    <span>{progress}%</span>
                    <div>
                      <i style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </div>

                <div className="loop-strip">
                  {['First day', 'Combat', 'Growth', 'Live ops'].map((step) => (
                    <div className="loop-step" key={step}>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>

                <div className="module-grid">
                  {systemModules.map((module) => (
                    <article className={`module-card ${module.tone}`} key={module.title}>
                      <span>{module.title}</span>
                      <strong>{module.value}</strong>
                    </article>
                  ))}
                </div>

                <div className="economy-table" role="table" aria-label="Economy snapshot">
                  {economyRows.map((row) => (
                    <div className="economy-row" role="row" key={row[0]}>
                      {row.map((cell) => (
                        <span role="cell" key={cell}>
                          {cell}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </section>

              <section className="inspector">
                <img
                  src={phoneImage}
                  alt="Phone app analysis desk"
                  className="inspector-image"
                />
                <h2>Innovation space</h2>
                <p>
                  The system separates competitor facts from new-game bets so
                  the team can innovate without blindly cloning.
                </p>
                <div className="opportunity-stack">
                  {opportunities.map((opportunity, index) => (
                    <article key={opportunity}>
                      <small>Opportunity {index + 1}</small>
                      <strong>{opportunity}</strong>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </section>
        )}

        {activeView === 'brief' && (
          <section className="screen">
            <header className="screen-header">
              <div>
                <p className="eyebrow">MVP Brief</p>
                <h1>Turn the deconstruction into a testable bet</h1>
                <p className="lede">
                  The brief keeps the first prototype small: one core loop, one
                  retention question, and no full live-ops machinery.
                </p>
              </div>
              <button className="primary-action" onClick={exportBrief}>
                Export brief
              </button>
            </header>

            <div className="brief-layout">
              <section className="panel brief-main">
                <h2>Strategic hypothesis</h2>
                <p className="brief-statement">
                  Keep the competitor's short-session combat payoff, reduce
                  early system load, and validate whether a lighter resource
                  loop can create a second-session pull.
                </p>

                <div className="brief-grid">
                  <article>
                    <span>Competitor pain</span>
                    <strong>
                      Resource gaps and system stacking appear before players
                      trust the battle loop.
                    </strong>
                  </article>
                  <article>
                    <span>Innovation direction</span>
                    <strong>
                      Move complexity later and make every first-day upgrade
                      visibly affect combat.
                    </strong>
                  </article>
                  <article>
                    <span>MVP must validate</span>
                    <strong>
                      Players understand battle and growth goals within five
                      minutes.
                    </strong>
                  </article>
                  <article>
                    <span>Do not build yet</span>
                    <strong>
                      Full draw pool, guild, heavy events, large roster, polished
                      store.
                    </strong>
                  </article>
                </div>
              </section>

              <aside className="panel mvp-checklist">
                <h2>Prototype scope</h2>
                {[
                  '1 hero, 3 enemies, 1 upgrade path',
                  'One soft currency and one stamina-like gate',
                  'Three short missions with visible reward change',
                  'One retention prompt after the first loss or win',
                ].map((item) => (
                  <label key={item}>
                    <input type="checkbox" defaultChecked />
                    <span>{item}</span>
                  </label>
                ))}
              </aside>
            </div>
          </section>
        )}

        {activeView === 'agents' && (
          <section className="screen">
            <header className="screen-header">
              <div>
                <p className="eyebrow">Agent Orchestration</p>
                <h1>Run the work as handoffs, not meetings</h1>
                <p className="lede">
                  Each Agent receives a bounded input and returns a reviewable
                  artifact before the next Agent starts.
                </p>
              </div>
              <button className="secondary-action" onClick={() => setSelectedAgent(0)}>
                Reset board
              </button>
            </header>

            <div className="agent-layout">
              <section className="agent-board">
                {agents.map((agent, index) => (
                  <button
                    className={
                      selectedAgent === index
                        ? `agent-card selected ${agent.tone}`
                        : `agent-card ${agent.tone}`
                    }
                    key={agent.name}
                    onClick={() => setSelectedAgent(index)}
                  >
                    <span>{agent.status}</span>
                    <strong>{agent.name}</strong>
                    <small>{agent.job}</small>
                  </button>
                ))}
              </section>

              <aside className="agent-inspector">
                <img
                  src={productImage}
                  alt="Gaming competitor analysis workstation"
                  className="agent-image"
                />
                <p className="eyebrow">Selected Agent</p>
                <h2>{activeAgent.name}</h2>
                <p>{activeAgent.job}</p>
                <div className="handoff-box">
                  <span>Required input</span>
                  <strong>
                    Package summary, system entrance map, economy rows, and
                    innovation constraints.
                  </strong>
                </div>
                <div className="handoff-box">
                  <span>Expected output</span>
                  <strong>
                    A structured artifact that the Producer Agent can accept or
                    send back for another run.
                  </strong>
                </div>
              </aside>
            </div>
          </section>
        )}

        {activeView === 'review' && (
          <section className="screen">
            <header className="screen-header">
              <div>
                <p className="eyebrow">MVP Review</p>
                <h1>Decide whether this prototype deserves more spend</h1>
                <p className="lede">
                  Review Agents merge playtest notes, package-derived risks, and
                  early metrics into one go, adjust, or stop decision.
                </p>
              </div>
              <button className="primary-action" onClick={exportBrief}>
                Create next iteration
              </button>
            </header>

            <div className="review-layout">
              <section className="decision-panel">
                <span>Current recommendation</span>
                <strong>Adjust and retest</strong>
                <p>
                  Combat feedback is promising, but early growth clarity must
                  improve before the team expands content or monetization.
                </p>
              </section>

              <section className="metric-panel">
                <article>
                  <strong>72%</strong>
                  <span>Want another run</span>
                </article>
                <article>
                  <strong>04:40</strong>
                  <span>Time to understand goal</span>
                </article>
              </section>

              <section className="panel findings-panel">
                <h2>Review findings</h2>
                {reviewFindings.map((finding) => (
                  <article className={`finding ${finding.tone}`} key={finding.label}>
                    <span>{finding.label}</span>
                    <strong>{finding.copy}</strong>
                  </article>
                ))}
              </section>

              <aside className="decision-actions">
                <button>Continue</button>
                <button className="recommended">Adjust and retest</button>
                <button>Stop project</button>
                <p>
                  Next iteration: fix first-day target clarity, resource pacing,
                  and battle-to-upgrade feedback only.
                </p>
              </aside>
            </div>
          </section>
        )}
      </section>
    </main>
  )
}

export default App
